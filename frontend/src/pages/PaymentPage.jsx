import PaymentHistory from '../components/payments/PaymentHistory'
import PaymentModal from '../components/payments/PaymentModal'

function PaymentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payments</h1>
      <PaymentHistory />
      <PaymentModal />
    </div>
  )
}

export default PaymentPage
