const http = require('http');
const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Job Board</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;background:#f4f7fb;color:#1f2937}
    .wrap{max-width:900px;margin:40px auto;padding:20px}
    .card{background:#fff;border-radius:14px;padding:20px;margin:16px 0;box-shadow:0 10px 30px rgba(15,23,42,.08)}
    input,textarea,button{width:100%;padding:12px;margin:8px 0;border-radius:10px;border:1px solid #cbd5e1;box-sizing:border-box;font-size:14px}
    button{background:#0f766e;color:#fff;border:none;font-weight:700;cursor:pointer}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
    .job{border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#f8fafc}
    small{color:#64748b}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Job Board</h1>
    <p>Frontend running on <strong>localhost:3000</strong> connected to backend <strong>localhost:5000</strong>.</p>

    <div class="card">
      <h2>Post a Job</h2>
      <form id="jobForm">
        <div class="grid">
          <input id="title" placeholder="Title" required />
          <input id="company" placeholder="Company" required />
          <input id="location" placeholder="Location" required />
          <input id="salary" placeholder="Salary" />
        </div>
        <textarea id="description" placeholder="Description" rows="4" required></textarea>
        <button type="submit">Post Job</button>
      </form>
      <small id="status"></small>
    </div>

    <div class="card">
      <h2>Job Listings</h2>
      <div id="jobs"></div>
    </div>
  </div>

  <script>
    const jobsEl = document.getElementById('jobs');
    const statusEl = document.getElementById('status');
    async function loadJobs() {
      const res = await fetch('http://localhost:5000/jobs');
      const jobs = await res.json();
      jobsEl.innerHTML = jobs.length ? jobs.map(job => `
        <div class="job">
          <h3>${job.title || ''}</h3>
          <p><strong>${job.company || ''}</strong> - ${job.location || ''}</p>
          <p>${job.description || ''}</p>
          <small>${job.salary ? 'Salary: ' + job.salary : ''}</small>
        </div>
      `).join('') : '<p>No jobs yet.</p>';
    }
    document.getElementById('jobForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.textContent = 'Posting...';
      await fetch('http://localhost:5000/jobs', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          title: title.value,
          company: company.value,
          location: location.value,
          salary: salary.value,
          description: description.value
        })
      });
      e.target.reset();
      statusEl.textContent = 'Job posted';
      loadJobs();
    });
    loadJobs();
  </script>
</body>
</html>`;
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(html);
}).listen(3000, () => console.log('Frontend running on http://localhost:3000'));
