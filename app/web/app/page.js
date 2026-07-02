const highlights = [
  "Sitios de productos",
  "VSL para negocio",
  "Sitio Master",
  "Automatizaciones",
  "Evolucion continua"
];

export default function Home() {
  const now = new Date().toLocaleString("es-CO", {
    dateStyle: "full",
    timeStyle: "short"
  });

  return (
    <main className="shell">
      <section className="hero">
        <div className="badge">PartnerHub</div>
        <h1>La capa operativa digital para multinivel.</h1>
        <p className="lead">
          Una plataforma administrada para crear, replicar y mantener sitios
          que venden productos y presentan negocio desde un unico ecosistema.
        </p>

        <div className="cards">
          {highlights.map((item) => (
            <article className="card" key={item}>
              {item}
            </article>
          ))}
        </div>

        <div className="panel">
          <div>
            <span className="label">Estado</span>
            <strong>Base inicial lista para despliegue</strong>
          </div>
          <div>
            <span className="label">Ultima actualizacion</span>
            <strong>{now}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

