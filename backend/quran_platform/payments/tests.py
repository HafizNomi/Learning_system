"""
Tests for the payment endpoints.

The webhook cases are the important ones: a webhook that silently 403s means
a customer's card is charged while the database still says 'pending'.
"""
import json
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from applications.models import Application
from courses.models import Course
from payments.models import Payment

User = get_user_model()


class PaymentTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.course = Course.objects.create(
            title='Tajweed Basics',
            description='Learn the rules of recitation',
            category='tajweed',
            price_per_month=Decimal('40.00'),
        )
        self.student = User.objects.create_user(
            email='parent@example.com', username='parent',
            password='Passw0rd!x', role='student',
        )
        self.application = Application.objects.create(
            student_name='Ayesha', student_age=9, student_gender='female',
            parent_name='Parent', parent_email='parent@example.com',
            parent_phone='+920000000', course=self.course,
            student=self.student, status='waiting_payment',
        )
        self.payment = Payment.objects.create(
            student=self.student, application=self.application,
            amount=self.course.price_per_month,
            payment_month=9, payment_year=2026,
            stripe_payment_intent_id='pi_test_123', status='pending',
        )


class PaymentModelTests(PaymentTestBase):
    def test_str_does_not_raise(self):
        """__str__ used to read self.month/self.year, which don't exist."""
        self.assertIn('parent@example.com', str(self.payment))
        self.assertIn('9/2026', str(self.payment))


@override_settings(STRIPE_WEBHOOK_SECRET='whsec_test')
class StripeWebhookTests(PaymentTestBase):
    """The webhook is called by Stripe, never by a logged-in user."""

    url = '/api/payments/webhook/'

    def _event(self, intent_id='pi_test_123'):
        return {
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': intent_id}},
        }

    @patch('stripe.Webhook.construct_event')
    def test_anonymous_webhook_is_accepted(self, construct_event):
        """
        Regression: the view inherited IsAuthenticatedOrReadOnly, so every
        Stripe call got 403 and paid cards stayed marked 'pending'.
        """
        construct_event.return_value = self._event()

        response = self.client.post(
            self.url, data=json.dumps(self._event()),
            content_type='application/json', HTTP_STRIPE_SIGNATURE='t=1,v1=sig',
        )

        self.assertEqual(response.status_code, 200)
        self.payment.refresh_from_db()
        self.application.refresh_from_db()
        self.assertEqual(self.payment.status, 'paid')
        self.assertIsNotNone(self.payment.paid_at)
        self.assertEqual(self.application.status, 'active')

    @patch('stripe.Webhook.construct_event')
    def test_duplicate_webhook_is_ignored(self, construct_event):
        """Stripe retries until it gets a 200, so replays must be harmless."""
        construct_event.return_value = self._event()
        body = json.dumps(self._event())

        for _ in range(2):
            response = self.client.post(
                self.url, data=body, content_type='application/json',
                HTTP_STRIPE_SIGNATURE='t=1,v1=sig',
            )
            self.assertEqual(response.status_code, 200)

        self.payment.refresh_from_db()
        first_paid_at = self.payment.paid_at
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'paid')
        self.assertEqual(self.payment.paid_at, first_paid_at)

    @patch('stripe.Webhook.construct_event')
    def test_bad_signature_is_rejected(self, construct_event):
        import stripe
        construct_event.side_effect = stripe.error.SignatureVerificationError('bad', 'sig')

        response = self.client.post(
            self.url, data='{}', content_type='application/json',
            HTTP_STRIPE_SIGNATURE='nonsense',
        )

        self.assertEqual(response.status_code, 400)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'pending')

    @patch('stripe.Webhook.construct_event')
    def test_unknown_payment_intent_does_not_crash(self, construct_event):
        construct_event.return_value = self._event('pi_does_not_exist')

        response = self.client.post(
            self.url, data=json.dumps(self._event('pi_does_not_exist')),
            content_type='application/json', HTTP_STRIPE_SIGNATURE='t=1,v1=sig',
        )

        self.assertEqual(response.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'pending')


@override_settings(STRIPE_WEBHOOK_SECRET='')
class WebhookNotConfiguredTests(PaymentTestBase):
    def test_unconfigured_webhook_refuses_rather_than_trusting_payload(self):
        response = self.client.post(
            '/api/payments/webhook/', data='{}', content_type='application/json',
        )
        self.assertEqual(response.status_code, 503)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'pending')


class PaymentHistoryTests(PaymentTestBase):
    def test_student_sees_only_their_own_payments(self):
        other = User.objects.create_user(
            email='other@example.com', username='other',
            password='Passw0rd!x', role='student',
        )
        Payment.objects.create(
            student=other, amount=Decimal('10.00'),
            payment_month=9, payment_year=2026,
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/payments/history/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)

    def test_anonymous_cannot_read_history(self):
        response = self.client.get('/api/payments/history/')
        self.assertEqual(response.status_code, 401)
