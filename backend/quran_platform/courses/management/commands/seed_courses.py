"""
Create the starter technology courses.

Idempotent: courses are matched on title, so running it twice does not create
duplicates. Existing courses are left alone unless --update is passed.

    python manage.py seed_courses
    python manage.py seed_courses --update   # overwrite the seeded courses
"""

from django.core.management.base import BaseCommand

from courses.models import Course

COURSES = [
    {
        'title': 'Artificial Intelligence for Beginners',
        'category': 'ai',
        'level': 'beginner',
        'price_per_month': '60.00',
        'duration_minutes': 60,
        'classes_per_week': 2,
        'description': (
            'A gentle introduction to Artificial Intelligence for students aged 12 and '
            'above. Learners find out what AI actually is, how machines learn from '
            'examples, and where AI already shows up in daily life. No programming '
            'experience is needed to start - Python is introduced slowly from week three, '
            'and every idea is taught through something the student builds and can show '
            'their family. The course closes with a small project of their own choosing.'
        ),
        'syllabus': (
            'Week 1 - What is intelligence? Human thinking compared with machine thinking\n'
            'Week 2 - How machines learn from examples; spotting patterns in data\n'
            'Week 3 - First steps in Python: variables, lists and loops\n'
            'Week 4 - Teaching a computer to sort pictures into groups\n'
            'Week 5 - Chatbots and language models: how they predict the next word\n'
            'Week 6 - Training a simple model on data the student collects\n'
            'Week 7 - Where AI gets things wrong: bias, mistakes and limits\n'
            'Week 8 - Using AI responsibly and honestly in schoolwork\n'
            'Week 9 - Project build: the student plans and makes their own AI mini-app\n'
            'Week 10 - Project presentation and a plan for what to learn next'
        ),
    },
    {
        'title': 'Blockchain Basics',
        'category': 'blockchain',
        'level': 'beginner',
        'price_per_month': '65.00',
        'duration_minutes': 60,
        'classes_per_week': 2,
        'description': (
            'A clear, practical introduction to blockchain for students aged 14 and above. '
            'Learners come away able to explain what a blockchain really is, why it is hard '
            'to tamper with, and what it is genuinely useful for - separately from the hype '
            'around cryptocurrency prices. Sessions are hands-on: students build a working '
            'toy blockchain in Python and read real transactions on a public explorer. '
            'Trading and speculation are not taught.'
        ),
        'syllabus': (
            'Week 1 - The problem blockchain solves: trust without a middleman\n'
            'Week 2 - Hashing: turning any data into a fingerprint\n'
            'Week 3 - Chaining blocks together, and why changing one breaks the rest\n'
            'Week 4 - Building a working toy blockchain in Python\n'
            'Week 5 - Distributed networks: who keeps the copies and who agrees\n'
            'Week 6 - Consensus explained: proof of work and proof of stake\n'
            'Week 7 - Reading real transactions on a public block explorer\n'
            'Week 8 - Smart contracts: agreements that run themselves\n'
            'Week 9 - Honest uses and real limits; scams and how to recognise them\n'
            'Week 10 - Project: the student designs a blockchain solution to a real problem'
        ),
    },
]


class Command(BaseCommand):
    help = 'Create the starter technology courses (AI and Blockchain).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--update',
            action='store_true',
            help='overwrite these courses if they already exist',
        )

    def handle(self, *args, **options):
        for fields in COURSES:
            title = fields['title']
            course, created = Course.objects.get_or_create(
                title=title,
                defaults={**fields, 'is_active': True},
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f'Created  {title}'))
            elif options['update']:
                for key, value in fields.items():
                    setattr(course, key, value)
                course.save()
                self.stdout.write(self.style.WARNING(f'Updated  {title}'))
            else:
                self.stdout.write(f'Skipped  {title} (already exists)')

        self.stdout.write(
            self.style.SUCCESS(f'\nActive courses now: {Course.objects.filter(is_active=True).count()}')
        )
