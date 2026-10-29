export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Notification preferences</h1>
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Push notifications</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Job updates</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Messages</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Promotions</label>
          </div>
          <h2 className="font-semibold text-gray-900 mt-6">Email</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Job updates</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Receipts</label>
          </div>
          <h2 className="font-semibold text-gray-900 mt-6">SMS</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" /> Job reminders</label>
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Save preferences</button>
        </div>
      </div>
    </div>
  );
}
