export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="bg-white border rounded-lg p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Language</h2>
          <select className="border rounded px-3 py-2">
            <option>English</option>
            <option>Hausa</option>
          </select>
          <h2 className="font-semibold text-gray-900">Linked accounts</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 border rounded">
              <span>Google: john@example.com</span>
              <button className="text-red-600 hover:underline text-sm">Unlink</button>
            </div>
            <button className="text-blue-600 hover:underline text-sm">+ Link another account</button>
          </div>
          <h2 className="font-semibold text-gray-900">Data</h2>
          <div className="space-y-2">
            <button className="text-blue-600 hover:underline text-sm">Request data export</button>
            <button className="text-red-600 hover:underline text-sm">Delete account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
