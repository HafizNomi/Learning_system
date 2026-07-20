function ApplicationForm() {
  return (
    <form className="space-y-3 rounded border bg-white p-4">
      <input className="w-full rounded border px-3 py-2" placeholder="Full name" />
      <input className="w-full rounded border px-3 py-2" placeholder="Email" />
      <button type="button" className="rounded bg-indigo-600 px-4 py-2 text-white">Submit</button>
    </form>
  )
}

export default ApplicationForm
