import { useState } from 'react';
import { ArrowUpRight, Check, Download, Github, Linkedin, Mail, Menu, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { contact, education, experience, profile, projects, skills } from './data';

function downloadResume() {
  const pdf = new jsPDF();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.text(profile.name, 20, 28);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.text(profile.role, 20, 38);

  pdf.setDrawColor(228, 87, 46);
  pdf.line(20, 46, 190, 46);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Profile', 20, 64);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(pdf.splitTextToSize(profile.summary, 170), 20, 74);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Experience', 20, 112);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  experience.forEach((item, index) => {
    const y = 122 + index * 10;
    pdf.text(`${item.title} — ${item.company} / ${item.period}`, 20, y);
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Selected skills', 20, 162);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(Object.values(skills).flat().slice(0, 6).join('  •  '), 20, 172);

  pdf.save(`${profile.name.toLowerCase().replace(/\s+/g, '-')}-resume.pdf`);
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState({ type: '', text: '' });
  const [sending, setSending] = useState(false);

  const goTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus({ type: '', text: '' });

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Something went wrong.');

      setStatus({ type: 'success', text: 'Message received. I will be in touch soon.' });
      setForm({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus({ type: 'error', text: error.message || 'Unable to send right now. Please email me directly.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="resume-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <a className="wordmark" href="#top">RB<span>/</span>26</a>
          <button className="menu-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="sidebar-profile">
          <img src="/assets/profile.svg" alt="Portrait of Rukhayya Banu" />
          <p className="availability"><span className="availability-dot" /> {profile.availability}</p>
          <h1>
            {profile.name.split(' ')[0]}<br />
            {profile.name.split(' ')[1]}
          </h1>
          <p className="sidebar-title">{profile.title}</p>
        </div>

        <div className="sidebar-block">
          <h2>Contact</h2>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <a href={`tel:${contact.phone.replace(/\s+/g, '')}`}>{contact.phone}</a>
          <span>{contact.location}</span>
        </div>

        <div className="sidebar-block">
          <h2>Core skills</h2>
          <div className="sidebar-skills">
            {Object.values(skills).flat().slice(0, 10).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>

        <div className="sidebar-block education">
          <h2>Education</h2>
          <strong>{education.degree}</strong>
          <span>
            {education.school}<br />
            {education.period}
          </span>
        </div>

        <div className="sidebar-social">
          {profile.socials.map((social) => (
            <a key={social.label} href={social.href} aria-label={social.label}>
              {social.label === 'GitHub' ? <Github size={17} /> : social.label === 'LinkedIn' ? <Linkedin size={17} /> : <Mail size={17} />}
            </a>
          ))}
        </div>
      </aside>

      <main id="top" className="main-column">
        <header className={menuOpen ? 'main-nav open' : 'main-nav'}>
          <nav>
            <button onClick={() => goTo('about')}>Profile</button>
            <button onClick={() => goTo('experience')}>Experience</button>
            <button onClick={() => goTo('work')}>Selected work</button>
            <button onClick={() => goTo('contact')}>Contact</button>
          </nav>
          <button className="download-link" onClick={downloadResume}>
            <Download size={15} /> Download CV
          </button>
        </header>

        <section id="about" className="intro-section">
          <div className="section-label">01 / Profile</div>
          <div>
            <h2>{profile.summary}</h2>
            <p>
              For the last eight years, I’ve helped teams turn fuzzy first principles into
              products people choose to use. I work across product strategy, interface design,
              and full-stack engineering to make complex things feel clear.
            </p>
            <p>{profile.tagline}</p>
          </div>
        </section>

        <section id="experience" className="content-section">
          <div className="section-label">02 / Experience</div>
          <div className="experience-list">
            {experience.map((item) => (
              <article key={item.title + item.company}>
                <div className="date">{item.period}</div>
                <div>
                  <h3>
                    {item.title} <span>/ {item.company}</span>
                  </h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="work" className="content-section">
          <div className="section-label">03 / Selected work</div>
          <div className="work-list">
            {projects.map((project) => (
              <article key={project.title} className={`work-item ${project.color}`}>
                <div className="work-number">{project.number}</div>
                <div>
                  <p className="work-type">{project.type}</p>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="work-meta">
                    <span>{project.stack}</span>
                    <strong>{project.result}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="content-section contact-section">
          <div className="section-label">04 / Contact</div>
          <div className="contact-panel">
            <h2>Have a good problem?</h2>
            <p>Tell me what you’re working on, what’s stuck, or what you’re curious about.</p>

            <form onSubmit={submit}>
              <div className="field">
                <label>Name</label>
                <input name="name" value={form.name} onChange={update} type="text" placeholder="Your name" required />
              </div>

              <div className="field">
                <label>Email</label>
                <input name="email" value={form.email} onChange={update} type="email" placeholder="you@company.com" required />
              </div>

              <div className="field">
                <label>Message</label>
                <textarea name="message" value={form.message} onChange={update} placeholder="A few words about the project..." rows="5" required />
              </div>

              <button type="submit" className="submit-button" disabled={sending}>
                {sending ? 'Sending...' : <>Send message <ArrowUpRight size={16} /></>}
              </button>

              {status.text && (
                <p className={`status ${status.type}`}>
                  {status.type === 'success' ? <Check size={16} /> : null}
                  {status.text}
                </p>
              )}
            </form>
          </div>
        </section>

        <footer className="site-footer">
          <span>© 2026 {profile.name}</span>
          <span>Designed & built with care</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
