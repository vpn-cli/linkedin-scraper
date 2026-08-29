export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>LinkedIn Profile Scraper API (Template)</h1>
      <p>The server is running successfully!</p>
      <br/>
      <h2>Endpoints available:</h2>
      <ul>
        <li>
          <code>GET /api/profile?url=&#123;profile_url&#125;</code>
        </li>
      </ul>
      <br/>
      <h3>Test the generic endpoint:</h3>
      <a href="/api/profile?url=https://example.com/profiles/dummy-user" style={{ color: 'blue', textDecoration: 'underline' }}>
        Click here to test the API with a generic URL
      </a>
    </main>
  );
}
