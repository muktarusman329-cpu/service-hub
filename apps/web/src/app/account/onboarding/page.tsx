export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ServiceHub</h1>
        <p className="text-gray-600 mb-6">Let&apos;s set up your account</p>
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
            <div className="flex-1 h-1 bg-blue-600 rounded" />
            <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold">2</div>
            <div className="flex-1 h-1 bg-gray-200 rounded" />
            <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold">3</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What do you need help with?</label>
            <select className="w-full border rounded px-3 py-2">
              <option>I need a service (plumber, electrician, etc.)</option>
              <option>I want to offer services (become a technician)</option>
              <option>Both</option>
            </select>
          </div>
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">Continue</button>
        </div>
      </div>
    </div>
  );
}
