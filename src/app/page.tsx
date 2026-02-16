export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Knowledge Base API</h1>
      <p className="text-gray-600">API is running. See /api/knowledge/entries</p>
      <div className="mt-8 text-sm text-gray-500">
        <h2 className="font-semibold mb-2">Endpoints:</h2>
        <ul className="list-disc list-inside">
          <li>GET/POST /api/knowledge/entries</li>
          <li>GET/PATCH/DELETE /api/knowledge/entries/:id</li>
          <li>POST /api/knowledge/search</li>
          <li>GET/POST /api/knowledge/tags</li>
          <li>DELETE /api/knowledge/tags/:id</li>
        </ul>
      </div>
    </main>
  );
}
