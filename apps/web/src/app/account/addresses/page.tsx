export default function AddressesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Saved addresses</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-4 text-sm">Add address</button>
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-medium text-gray-900">Home</p>
              <p className="text-sm text-gray-600">Near Bosso market, Bosso</p>
              <p className="text-sm text-gray-500">Minna, Niger State</p>
            </div>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">Default</span>
          </div>
          <div className="flex gap-2">
            <button className="text-blue-600 hover:underline text-sm">Edit</button>
            <button className="text-red-600 hover:underline text-sm">Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
}
