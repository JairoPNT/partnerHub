---
marp: true
theme: default
paginate: true
size: 16:9
backgroundColor: #f8fafc
header: ''
footer: 'Franquicia Digital · Ecosistemas Digitales Administrados'
style: |
  /* ===================== SISTEMA VISUAL ===================== */
  :root {
    --navy: #1e3a8a;
    --accent: #2563eb;
    --bg: #f8fafc;
    --ink: #0f172a;
    --muted: #64748b;
    --line: #e2e8f0;
    --white: #ffffff;
    --ok: #059669;
    --warn: #b45309;
  }

  section {
    background: var(--bg);
    color: var(--ink);
    font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 24px;
    line-height: 1.45;
    padding: 60px 70px 70px 70px;
    letter-spacing: -0.01em;
  }

  /* Barra superior de marca */
  section::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 8px;
    background: linear-gradient(90deg, var(--navy) 0%, var(--accent) 100%);
  }

  h1 {
    color: var(--navy);
    font-size: 52px;
    font-weight: 800;
    line-height: 1.1;
    margin: 0 0 8px 0;
    letter-spacing: -0.03em;
  }

  h2 {
    color: var(--navy);
    font-size: 38px;
    font-weight: 750;
    margin: 0 0 6px 0;
    letter-spacing: -0.025em;
  }

  h3 {
    color: var(--accent);
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 10px 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* Subtítulo bajo el H2 */
  .sub {
    color: var(--muted);
    font-size: 21px;
    margin: 0 0 26px 0;
    max-width: 46ch;
  }

  strong { color: var(--navy); font-weight: 700; }
  em { color: var(--accent); font-style: normal; font-weight: 600; }

  ul { margin: 0; padding-left: 0; list-style: none; }
  ul li {
    position: relative;
    padding-left: 34px;
    margin-bottom: 16px;
  }
  ul li::before {
    content: '';
    position: absolute;
    left: 4px; top: 12px;
    width: 10px; height: 10px;
    border-radius: 3px;
    background: var(--accent);
  }

  footer {
    color: var(--muted);
    font-size: 14px;
    letter-spacing: 0.02em;
  }
  section::after { /* paginación */
    color: var(--muted);
    font-size: 14px;
  }

  /* ===================== PORTADA ===================== */
  section.cover {
    background: linear-gradient(140deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%);
    color: #ffffff;
    justify-content: center;
  }
  section.cover::before { display: none; }
  section.cover h1 { color: #ffffff; font-size: 66px; }
  section.cover h3 { color: #bfdbfe; }
  section.cover .sub { color: #dbeafe; font-size: 26px; max-width: 40ch; }
  section.cover footer, section.cover::after { color: rgba(255,255,255,0.55); }
  section.cover .kicker {
    display: inline-block;
    border: 1.5px solid rgba(255,255,255,0.45);
    border-radius: 999px;
    padding: 8px 20px;
    font-size: 17px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #dbeafe;
    margin-bottom: 28px;
  }
  section.cover .rule {
    width: 90px; height: 5px; border-radius: 4px;
    background: #60a5fa; margin: 30px 0 26px 0;
  }
  section.cover .meta { color: #bfdbfe; font-size: 19px; }

  /* ===================== CIERRE ===================== */
  section.close {
    background: linear-gradient(140deg, #1e3a8a 0%, #2563eb 100%);
    color: #ffffff;
    justify-content: center;
  }
  section.close::before { display: none; }
  section.close h2 { color: #ffffff; font-size: 46px; }
  section.close .sub { color: #dbeafe; }
  section.close ul li::before { background: #60a5fa; }
  section.close strong { color: #ffffff; }
  section.close footer, section.close::after { color: rgba(255,255,255,0.55); }

  /* ===================== LAYOUT ===================== */
  .cols   { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .cols-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
  .cols-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

  .card {
    background: var(--white);
    border: 1px solid var(--line);
    border-left: 5px solid var(--accent);
    border-radius: 14px;
    padding: 22px 24px;
    box-shadow: 0 2px 10px rgba(15,23,42,0.05);
  }
  .card h4 {
    color: var(--navy);
    font-size: 21px;
    font-weight: 750;
    margin: 0 0 8px 0;
  }
  .card p { margin: 0; font-size: 18px; color: #334155; line-height: 1.4; }
  .card ul li { font-size: 18px; margin-bottom: 9px; padding-left: 24px; }
  .card ul li::before { width: 7px; height: 7px; top: 10px; left: 2px; }

  .card.ghost   { border-left-color: var(--muted); }
  .card.good    { border-left-color: var(--ok); }
  .card.warn    { border-left-color: var(--warn); }
  .card.hero    { border-left-color: #f59e0b; background: #fffdf7; }

  .num {
    display: inline-flex;
    align-items: center; justify-content: center;
    width: 38px; height: 38px;
    border-radius: 10px;
    background: var(--navy);
    color: #fff; font-weight: 800; font-size: 19px;
    margin-bottom: 10px;
  }

  .price {
    color: var(--navy);
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.02em;
    display: block;
    margin: 6px 0 2px 0;
  }
  .fee { color: var(--accent); font-size: 17px; font-weight: 650; }
  .note { color: var(--muted); font-size: 16px; }

  .tag {
    display: inline-block;
    background: #dbeafe; color: var(--navy);
    border-radius: 999px;
    padding: 5px 14px;
    font-size: 15px; font-weight: 700;
    letter-spacing: 0.04em; text-transform: uppercase;
    margin-bottom: 10px;
  }
  .tag.gold { background: #fef3c7; color: #92400e; }
  .tag.red  { background: #fee2e2; color: #991b1b; }
  .tag.green{ background: #d1fae5; color: #065f46; }

  /* ===================== TABLAS ===================== */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 19px;
    background: var(--white);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(15,23,42,0.06);
  }
  th {
    background: var(--navy);
    color: #ffffff;
    text-align: left;
    padding: 14px 16px;
    font-weight: 700;
    font-size: 18px;
  }
  td {
    padding: 13px 16px;
    border-bottom: 1px solid var(--line);
    color: #1e293b;
  }
  tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #f1f5f9; }
  td strong { color: var(--navy); }

  .highlight-col { background: #eff6ff !important; }

  .footnote {
    margin-top: 20px;
    color: var(--muted);
    font-size: 16px;
    border-left: 3px solid var(--line);
    padding-left: 14px;
  }
---

<!-- _class: cover -->
<!-- _paginate: false -->

<div class="kicker">Ecosistemas Digitales Administrados</div>

# Franquicia Digital

<div class="rule"></div>

<div class="sub">Tu presencia digital lista para <strong style="color:#fff">presentar</strong>, <strong style="color:#fff">atraer</strong> y <strong style="color:#fff">conectar</strong>.</div>

<div class="meta">No vendemos páginas web. Administramos el sistema comercial que te representa 24/7.</div>

<!--
GUION DEL ORADOR — Portada (60–75 seg)

"Antes de empezar, quiero que sepas exactamente qué vas a ver en los próximos 15 minutos.
No te voy a mostrar una página web. Las páginas web se quedan quietas y no venden.

Lo que te voy a mostrar es una FRANQUICIA DIGITAL: un ecosistema que nosotros
organizamos, diseñamos, publicamos y MANTENEMOS por ti — para que tu negocio se
presente igual de bien cuando tú estás dormido que cuando tú estás en vivo.

Tres verbos, y quiero que los retengas: PRESENTAR, ATRAER y CONECTAR.
Presentar tu oferta con dignidad. Atraer al prospecto correcto. Y conectarlo
directo a tu WhatsApp, que es donde tú realmente cierras.

¿Te parece si arrancamos por el problema? Porque si el problema no te suena,
lo demás no te va a servir."

[Pausa. Espera confirmación verbal o del chat antes de avanzar.]
-->

---

## El Reto Comercial

<div class="sub">Tu oferta es buena. Tu forma de mostrarla te está costando dinero.</div>

<div class="cols">
<div class="card warn">
<h4>🔗 Enlaces dispersos</h4>
<p>Un link para el catálogo, otro para el video, otro para el formulario. El prospecto se pierde entre pestañas y abandona.</p>
</div>
<div class="card warn">
<h4>🎙️ Audios de 8 minutos</h4>
<p>Explicas lo mismo 20 veces al día. Tu tiempo se va en repetir, no en cerrar.</p>
</div>
<div class="card warn">
<h4>📄 PDFs pesados y feos</h4>
<p>Diseño improvisado que no abre bien en celular. Lo que ve tu prospecto no refleja lo que tú vales.</p>
</div>
<div class="card warn">
<h4>💧 Fuga de prospectos</h4>
<p>Interesados que nunca dejaron su dato, o que lo dejaron y nadie les escribió a tiempo.</p>
</div>
</div>

<div class="footnote">El problema no es tu producto. Es que tu presentación no está <strong>ordenada, viva ni administrada</strong>.</div>

<!--
GUION DEL ORADOR — El Reto Comercial (90 seg)

"Déjame describirte un día normal y tú me dices si me equivoco.

Llega un interesado. Tú le mandas un link del catálogo, después un audio de ocho
minutos explicando el negocio, después un PDF que te pasaron hace dos años y que
en el celular se ve minúsculo. Y al final le dices: 'cualquier cosa me escribes'.

¿Qué pasa ahí? Tres cosas, todas caras:
Uno — el prospecto tiene que hacer el trabajo de armar el rompecabezas. Y no lo hace.
Dos — tú repites el mismo discurso veinte veces al día. Ese es tu activo más caro: tu tiempo.
Tres — el que sí se interesó, no queda registrado en ningún lado. Se evapora.

Y aquí está lo importante: tu producto no es el problema. Tu presentación sí.
Estás compitiendo con negocios que se ven mejor que tú, aunque tú seas mejor que ellos.

Pregunta directa: ¿de estos cuatro, cuál te está doliendo más ahorita?"

[ESCUCHA. Anota su respuesta — la vas a usar en la diapositiva 6 y en el cierre.]
-->

---

## La Brecha Digital

<div class="sub">Tres caminos posibles. Solo uno te devuelve tiempo.</div>

<div class="cols-3">
<div class="card ghost">
<div class="tag red">Camino 1</div>
<h4>Hacerlo tú mismo</h4>
<ul>
<li>Semanas de tutoriales</li>
<li>Plantillas genéricas</li>
<li>Se rompe y nadie lo arregla</li>
<li><strong>Costo real: tu tiempo</strong></li>
</ul>
</div>
<div class="card ghost">
<div class="tag red">Camino 2</div>
<h4>Agencia tradicional</h4>
<ul>
<li>Millones de inversión inicial</li>
<li>Entregan y desaparecen</li>
<li>Cada cambio se cobra aparte</li>
<li><strong>Costo real: rigidez</strong></li>
</ul>
</div>
<div class="card good">
<div class="tag green">Camino 3</div>
<h4>Servicio administrado</h4>
<ul>
<li>Publicado en días, no meses</li>
<li>Inversión inicial accesible</li>
<li>Mantenimiento incluido</li>
<li><strong>Costo real: cero fricción</strong></li>
</ul>
</div>
</div>

<div class="footnote">La diferencia no es el diseño. Es <strong>quién responde</strong> cuando algo hay que cambiar mañana.</div>

<!--
GUION DEL ORADOR — La Brecha Digital (90 seg)

"Frente a este problema tú tienes exactamente tres caminos. Ni uno más.

CAMINO UNO: hacerlo tú. Te metes a YouTube, compras una plantilla, peleas con el
dominio. En el mejor de los casos, en tres semanas tienes algo que funciona a medias.
Y el día que se rompe — porque se rompe — el problema vuelve a ser tuyo.

CAMINO DOS: contratar una agencia tradicional. Cotización de varios millones,
tres meses de proceso, te entregan un archivo bonito... y se despiden.
Seis meses después necesitas cambiar un precio y te cobran el cambio. Aparte.

CAMINO TRES: un servicio administrado. Que es lo que nosotros hacemos.
Tú no compras un archivo. Contratas a un equipo que mantiene tu ecosistema vivo.

Y quiero ser muy honesto contigo: la diferencia real entre estos caminos no es
el diseño. Los tres pueden verse decentes el día uno. La diferencia es QUIÉN
CONTESTA el mes seis, cuando cambias de oferta, cuando subes un testimonio nuevo,
cuando el servidor se cae un domingo.

Nosotros contestamos. Eso es lo que estás comprando."
-->

---

## La Solución Administrada

<div class="sub">Cuatro piezas que trabajan como un solo sistema comercial.</div>

<div class="cols-4">
<div class="card">
<div class="num">1</div>
<h4>Ecosistema de Producto</h4>
<p>Tu oferta presentada con claridad: beneficios, testimonios y cierre por WhatsApp.</p>
</div>
<div class="card">
<div class="num">2</div>
<h4>Sistema de Negocio</h4>
<p>Tu oportunidad comercial explicada con VSL, tu historia y agendamiento.</p>
</div>
<div class="card">
<div class="num">3</div>
<h4>Motor de Prospectos</h4>
<p>Campañas en Meta Ads que llevan tráfico calificado a tu ecosistema.</p>
</div>
<div class="card">
<div class="num">4</div>
<h4>Evolución Continua</h4>
<p>Ajustes, actualizaciones y soporte mes a mes. Nunca se queda viejo.</p>
</div>
</div>

<div class="footnote">Puedes empezar por una pieza. El sistema completo es donde ocurre la <strong>multiplicación</strong>.</div>

<!--
GUION DEL ORADOR — La Solución Administrada (100 seg)

"Entonces, ¿qué es concretamente una Franquicia Digital? Son cuatro piezas.

PIEZA UNO — El Ecosistema de Producto. Aquí vive lo que tú vendes.
Los beneficios, los puntos de dolor que resuelves, los testimonios de gente real
que ya te compró, y un botón que lleva directo a tu WhatsApp. Sin escalas.

PIEZA DOS — El Sistema de Negocio. Esto es distinto y es clave.
Aquí no vendes producto: vendes la OPORTUNIDAD. Tu video VSL, tu historia como
líder, las preguntas frecuentes que siempre te hacen, y un sistema para que
agenden contigo. Esto es lo que te construye equipo.

PIEZA TRES — El Motor de Prospectos. Porque un ecosistema hermoso sin visitantes
es un local elegante en una calle sin gente. Aquí ponemos las campañas.

PIEZA CUATRO — y esta es la que nadie más te va a ofrecer — Evolución Continua.
Tu ecosistema no se entrega y se abandona. Se mantiene. Se actualiza. Se corrige.

Ahora, no tienes que empezar con las cuatro. Puedes arrancar por una.
Pero te voy a mostrar por qué las dos primeras juntas son donde está el salto real."
-->

---

## Beneficios por Capa

<div class="sub">Lo que ganas no es una web. Es posición, tiempo y respaldo.</div>

<div class="cols">
<div class="card">
<div class="tag">Funcional</div>
<h4>Orden y velocidad</h4>
<ul>
<li>Un solo enlace lo explica todo</li>
<li>Carga optimizada en celular</li>
<li>Prospectos enrutados a WhatsApp</li>
</ul>
</div>
<div class="card">
<div class="tag">Emocional</div>
<h4>Confianza al presentar</h4>
<ul>
<li>Dejas de improvisar en cada llamada</li>
<li>Tu marca se ve a la altura de tu oferta</li>
<li>Vendes sin sentir que ruegas</li>
</ul>
</div>
<div class="card">
<div class="tag">Social</div>
<h4>Autoridad visible</h4>
<ul>
<li>Te diferencias de quien manda audios</li>
<li>Tu equipo replica un estándar</li>
<li>Testimonios que respaldan tu palabra</li>
</ul>
</div>
<div class="card">
<div class="tag">Económico</div>
<h4>Costo predecible</h4>
<ul>
<li>Inversión inicial accesible</li>
<li>Fee mensual fijo, sin sorpresas</li>
<li>Recuperas horas de explicación diaria</li>
</ul>
</div>
</div>

<!--
GUION DEL ORADOR — Beneficios por Capa (85 seg)

"Cuando alguien contrata esto, gana en cuatro niveles distintos. Y normalmente
el que más le importa al cliente no es el que él cree.

FUNCIONAL — lo obvio. Un solo enlace reemplaza cinco. Carga rápido en celular,
que es donde está el 90% de tus prospectos. Y todo desemboca en tu WhatsApp.

EMOCIONAL — y aquí presta atención. Dejas de improvisar. Cuando tú tienes un
activo que te respalda, cambia tu tono al vender. Dejas de sonar a que estás
rogando y empiezas a sonar a que estás invitando. Eso lo siente el prospecto.

SOCIAL — te separa del montón. Mientras tu competencia manda audios de ocho
minutos, tú mandas un enlace profesional. Y si tienes equipo, todos replican el
mismo estándar. No dependes de que cada quien explique como pueda.

ECONÓMICO — costo predecible. Sabes exactamente qué pagas al mes. Sin facturas
sorpresa por 'un cambio pequeño'.

De estas cuatro, ¿cuál te suena más urgente a ti?"

[ESCUCHA. Su respuesta te dice desde qué ángulo cerrar en la diapositiva 12.]
-->

---

## Demostración en Vivo

<div class="sub">Así se ve del lado de tu prospecto. En su celular. En 90 segundos.</div>

<div class="cols">
<div class="card">
<div class="num">1</div>
<h4>Abre desde el celular</h4>
<p>Tú mandas un solo enlace por WhatsApp. Carga al instante, sin apps, sin registro.</p>
</div>
<div class="card">
<div class="num">2</div>
<h4>Se educa solo</h4>
<p>Recorre beneficios, dolores resueltos y testimonios en el orden correcto — el orden que tú usarías.</p>
</div>
<div class="card">
<div class="num">3</div>
<h4>Ve la prueba</h4>
<p>Video VSL y testimonios autorizados hacen el trabajo de convencer antes de que tú hables.</p>
</div>
<div class="card good">
<div class="num">4</div>
<h4>Aterriza en tu WhatsApp</h4>
<p>Un toque y el chat abre con mensaje pre-escrito. Tú recibes al prospecto ya educado.</p>
</div>
</div>

<div class="footnote">Tu conversación deja de empezar en <em>“¿de qué se trata?”</em> y empieza en <strong>“¿cómo arranco?”</strong></div>

<!--
GUION DEL ORADOR — Demostración en Vivo (2–3 min · COMPARTE PANTALLA AQUÍ)

[ACCIÓN: Comparte pantalla. Abre el demo en vista MÓVIL, no escritorio.
 El prospecto tiene que verlo como lo vería su cliente.]

"Deja de imaginártelo, te lo muestro. Y fíjate que lo abro en celular,
porque ahí es donde tu prospecto lo va a ver de verdad.

[Desliza lento por el encabezado]
Primero: esto es lo único que tú mandas. Un enlace. No cinco.
Y mira la velocidad de carga — nadie espera cinco segundos por un PDF.

[Baja a la sección de dolores/beneficios]
Aquí tu prospecto se está educando SOLO. En el orden que tú querrías explicarle,
pero sin gastar tu tiempo. Esta sección es la que reemplaza tu audio de ocho minutos.

[Baja a testimonios / VSL]
Y aquí está la parte que a ti te cuesta hacer en vivo: la prueba.
Testimonios autorizados, video explicando la oportunidad. Esto convence antes de
que tú digas una palabra.

[Toca el botón de WhatsApp — MUÉSTRALO ABRIENDO EL CHAT]
Y este es el momento clave. Un toque. Se abre tu WhatsApp, con el mensaje ya escrito.

Fíjate en la diferencia: tu conversación ya no empieza en '¿de qué se trata?'.
Empieza en '¿cómo arranco?'. Esa es toda la diferencia.

¿Qué te pareció? ¿Qué sección le pondrías tú a tu negocio?"

[ESCUCHA. Si menciona una sección específica, ya está proyectándose adentro.
 Eso es señal de compra.]
-->

---

## Servicio Completo Integrado

<div class="sub">Todo lo técnico, resuelto por nosotros. Tú solo apruebas.</div>

<div class="cols-3">
<div class="card">
<h4>🔍 Diagnóstico inicial</h4>
<p>Entendemos tu oferta, tu cliente ideal y tu proceso de cierre antes de diseñar nada.</p>
</div>
<div class="card">
<h4>✍️ Curaduría de contenido</h4>
<p>Ordenamos tus textos, fotos, videos y testimonios en una narrativa que vende.</p>
</div>
<div class="card">
<h4>🚀 Diseño y publicación</h4>
<p>Diseño profesional, adaptado a celular y publicado en línea listo para compartir.</p>
</div>
<div class="card">
<h4>🔒 Certificado SSL</h4>
<p>Conexión segura y candado de confianza. Sin advertencias que espanten prospectos.</p>
</div>
<div class="card">
<h4>🖥️ Servidor y hosting</h4>
<p>Infraestructura, dominio y disponibilidad administrados por nosotros. Incluido en el fee.</p>
</div>
<div class="card">
<h4>🤝 Soporte continuo</h4>
<p>Cambios de precios, nuevos testimonios y ajustes mes a mes. Escribes y lo hacemos.</p>
</div>
</div>

<!--
GUION DEL ORADOR — Servicio Completo Integrado (80 seg)

"Ahora, la pregunta natural es: '¿y yo qué tengo que hacer?'
La respuesta es: aprobar. Nada más.

Empezamos con un DIAGNÓSTICO. Antes de diseñar un solo pixel, entendemos tu oferta,
quién es tu cliente ideal y cómo cierras hoy. Porque diseñar sin eso es decoración.

Después, CURADURÍA DE CONTENIDO. Y esta palabra es importante: no te pedimos que
tú escribas. Tú nos das lo que tienes — fotos, audios, testimonios sueltos — y
nosotros lo ordenamos en una narrativa que vende.

Luego DISEÑO Y PUBLICACIÓN. Profesional, optimizado para celular, y en línea.

Y aquí van tres cosas que normalmente te cobran aparte:
El SSL — ese candadito de seguridad. Sin él, el navegador le dice a tu prospecto
'este sitio no es seguro'. Imagínate el daño.
El SERVIDOR y el dominio — administrados por nosotros, incluidos en el fee.
Y el SOPORTE CONTINUO — cambias de precio, nos escribes, lo hacemos. Sin cotización.

Eso es lo que significa 'administrado'. No es una palabra bonita. Es que el
trabajo técnico deja de ser tuyo."
-->

---

## Expectativas Claras

<div class="sub">Prefiero perder una venta hoy que perder tu confianza en dos meses.</div>

<div class="cols">
<div class="card good">
<div class="tag green">Lo que SÍ hacemos</div>
<ul>
<li>Construimos y administramos tu <strong>vehículo comercial</strong></li>
<li>Presentamos tu oferta con claridad y profesionalismo</li>
<li>Capturamos y enrutamos prospectos a tu canal de ventas</li>
<li>Mantenemos todo vivo, seguro y actualizado</li>
</ul>
</div>
<div class="card warn">
<div class="tag red">Lo que NO prometemos</div>
<ul>
<li>Ventas mágicas sin que tú atiendas</li>
<li>Resultados sin tráfico ni constancia</li>
<li>Reemplazar tu proceso comercial humano</li>
<li>Cifras garantizadas de cierres o ingresos</li>
</ul>
</div>
</div>

<div class="footnote">Nosotros ponemos el <strong>vehículo</strong>. Tú pones el <strong>conductor</strong>. Así funciona, y así te lo digo de frente.</div>

<!--
GUION DEL ORADOR — Expectativas Claras (75 seg · DIAPOSITIVA DE CONFIANZA)

"Esta diapositiva es mi favorita, y probablemente sea la más rara que vas a ver
en una presentación de ventas. Porque aquí te voy a decir lo que NO hacemos.

Lo que SÍ hacemos: construimos y administramos tu vehículo comercial. Presentamos
tu oferta con claridad. Capturamos prospectos y los enrutamos a tu WhatsApp.
Y lo mantenemos vivo mes a mes.

Ahora lo que NO prometemos, y te pido que me creas justo aquí:
No prometemos ventas mágicas. Si tú no contestas el WhatsApp, esto no sirve.
No prometemos resultados sin tráfico. Un ecosistema sin visitantes no vende.
No reemplazamos tu proceso comercial humano. La relación la construyes tú.
Y no te voy a garantizar un número de cierres. Quien te garantice eso, te está mintiendo.

La analogía que uso es esta: nosotros ponemos el vehículo — bueno, rápido, bien
mantenido. Tú pones el conductor.

Te lo digo de frente porque prefiero perder una venta hoy que perder tu confianza
en dos meses. ¿Estamos alineados en eso?"

[ESPERA CONFIRMACIÓN. Este 'sí' es el que habilita el cierre.]
-->

---

## Soluciones Comercializables

<div class="sub">Tres formas de entrar. Una recomendada.</div>

<div class="cols-3">
<div class="card">
<div class="tag">Opción A</div>
<h4>Ecosistema de Producto</h4>
<ul>
<li>Presentación visual de productos y servicios</li>
<li>Testimonios autorizados</li>
<li>Puntos de dolor resueltos</li>
<li>Cierre directo por WhatsApp</li>
</ul>
<span class="note">Ideal si vendes <strong>producto</strong>.</span>
</div>
<div class="card">
<div class="tag">Opción B</div>
<h4>Sistema de Negocio</h4>
<ul>
<li>Explicación de la oportunidad comercial</li>
<li>Video VSL profesional</li>
<li>Historia del líder y preguntas frecuentes</li>
<li>Sistema de agendamiento</li>
</ul>
<span class="note">Ideal si construyes <strong>equipo</strong>.</span>
</div>
<div class="card hero">
<div class="tag gold">★ Recomendado</div>
<h4>Plan 360</h4>
<ul>
<li>Producto + Negocio integrados</li>
<li>Una sola narrativa, dos objetivos</li>
<li><strong>20% de descuento</strong></li>
<li>Fee mensual combinado</li>
</ul>
<span class="note">Ideal si haces <strong>las dos cosas</strong>.</span>
</div>
</div>

<!--
GUION DEL ORADOR — Soluciones Comercializables (80 seg)

"Muy bien. Entonces, ¿cómo se compra esto? Hay tres formas de entrar.

OPCIÓN A — Ecosistema de Producto. Si lo tuyo es vender producto, esta es.
Presentación visual de lo que ofreces, testimonios autorizados de clientes reales,
los dolores que tú resuelves, y cierre directo por WhatsApp.

OPCIÓN B — Sistema de Negocio. Si lo tuyo es construir equipo, esta es la tuya.
Aquí explicamos la oportunidad comercial, montamos tu video VSL, contamos tu
historia como líder — que es lo que realmente atrae gente — las preguntas
frecuentes, y el sistema para que agenden contigo.

OPCIÓN C — el Plan 360. Y déjame ser directo: esta es la que recomiendo,
y no solo por el descuento.

La razón es esta: la mayoría de los empresarios como tú hacen LAS DOS COSAS.
Vendes producto Y construyes equipo. Si solo montas una mitad, el prospecto que
llega por producto y le interesa el negocio... se queda sin a dónde ir. Se pierde.

El Plan 360 cierra ese hueco. Una sola narrativa, dos objetivos.

Y sí — además tiene 20% de descuento. Te muestro los números exactos."

[TRANSICIÓN. Avanza sin pausa a la matriz. No dejes aire antes del precio.]
-->

---

## Matriz de Oferta e Inversión

<div class="sub">Cifras completas, sin letra pequeña. Valores en pesos colombianos.</div>

| Solución | Implementación | Fee mensual | Alcance principal |
|---|---|---|---|
| **Ecosistema de Producto** | $247.000 COP | $59.900 COP / mes | Productos, testimonios, dolores y cierre por WhatsApp |
| **Sistema de Negocio** | $347.000 COP | $59.900 COP / mes | Oportunidad, VSL, historia del líder, FAQ y agendamiento |
| **⭐ Plan 360 — Recomendado** | **$475.200 COP** | **$89.900 COP / mes** | **Producto + Negocio integrados en un solo ecosistema** |

<div class="cols-3" style="margin-top:26px">
<div class="card ghost">
<span class="note">Subtotal individual</span>
<span class="price" style="color:#64748b">$594.000</span>
<span class="note">$247.000 + $347.000</span>
</div>
<div class="card good">
<span class="note">Descuento especial 20%</span>
<span class="price" style="color:#059669">– $118.800</span>
<span class="note">Exclusivo por integración</span>
</div>
<div class="card hero">
<span class="note">Inversión final Plan 360</span>
<span class="price" style="color:#92400e">$475.200</span>
<span class="fee" style="color:#92400e">+ $89.900 COP / mes</span>
</div>
</div>

<!--
GUION DEL ORADOR — Matriz de Oferta e Inversión (2 min · NÚCLEO DE LA VENTA)

[REGLA DE ORO: di el precio con voz firme y NO te disculpes. Después del número,
 haz silencio. El primero que hable después del precio, pierde.]

"Aquí están todos los números. Sin letra pequeña.

El Ecosistema de Producto: doscientos cuarenta y siete mil pesos de implementación,
y cincuenta y nueve mil novecientos al mes.

El Sistema de Negocio: trescientos cuarenta y siete mil de implementación,
y los mismos cincuenta y nueve mil novecientos al mes.

Y aquí abajo mira lo que pasa con el Plan 360:
Si los compras por separado, suman quinientos noventa y cuatro mil pesos.
Nosotros aplicamos un veinte por ciento de descuento — ciento dieciocho mil
ochocientos pesos menos.

Tu inversión final por el ecosistema completo: CUATROCIENTOS SETENTA Y CINCO MIL
DOSCIENTOS PESOS. Y el fee combinado queda en OCHENTA Y NUEVE MIL NOVECIENTOS al mes.

[SILENCIO. Cuenta tres segundos completos.]

Y fíjate en el detalle del fee: si compraras los dos por separado, pagarías
cincuenta y nueve nueve más cincuenta y nueve nueve — casi ciento veinte mil al mes.
Integrado, pagas ochenta y nueve nueve. Ahorras también en el mensual.

Ese fee mensual, para que quede claro, es lo que mantiene el servidor, el SSL,
el soporte y los cambios que necesites. No es una suscripción a nada. Es tu
equipo técnico de planta.

¿Qué te dice el número?"

[SI DICE 'ESTÁ CARO': "Entiendo. Comparémoslo con lo que cuesta tu tiempo:
 ¿cuántas horas a la semana gastas explicando lo mismo? Multiplícalo por tu hora."]
-->

---

## Motor de Prospectos

<div class="sub">Tu ecosistema ya convierte. Ahora hay que llenarlo de gente.</div>

<div class="cols-3">
<div class="card">
<span class="note">Puesta en marcha</span>
<span class="price">$197.000</span>
<span class="note">Estructura de campaña, públicos, piezas y píxel de seguimiento.</span>
</div>
<div class="card">
<span class="note">Mantenimiento y optimización</span>
<span class="price">$89.900 <span style="font-size:18px">/ mes</span></span>
<span class="note">Monitoreo, ajustes de segmentación y reporte de desempeño.</span>
</div>
<div class="card ghost">
<span class="note">Inversión en pauta</span>
<span class="price" style="color:#64748b">La define el cliente</span>
<span class="note">Se paga <strong>directamente a Meta</strong>. No pasa por nosotros.</span>
</div>
</div>

<div class="footnote">
<strong>Condición del honorario:</strong> el valor de $89.900 COP / mes corresponde a presupuestos de pauta <strong>inferiores a $500.000 COP mensuales</strong>. Por encima de ese monto, el honorario se recalcula según el volumen gestionado.
</div>

<!--
GUION DEL ORADOR — Motor de Prospectos (100 seg)

"Última pieza, y es opcional — pero te la explico porque tarde o temprano la vas
a necesitar.

Ya tienes un ecosistema que convierte. Perfecto. Pero convierte a quien llega.
Si nadie llega, no pasa nada. Es como abrir un local hermoso en una calle sin gente.

El Motor de Prospectos son campañas en Meta — Facebook e Instagram — que llevan
tráfico calificado a tu ecosistema.

Son tres números y quiero que los separes bien en tu cabeza:

UNO — Puesta en marcha: ciento noventa y siete mil pesos, pago único. Ahí montamos
la estructura de campaña, definimos los públicos, armamos las piezas e instalamos
el píxel de seguimiento.

DOS — Mantenimiento y optimización: ochenta y nueve mil novecientos al mes.
Eso es que alguien está mirando tus campañas, ajustando segmentación y reportándote
qué está funcionando. Una campaña sin optimizar quema plata.

TRES — y este es distinto: la inversión en pauta. Ese dinero NO nos lo pagas a
nosotros. Lo pagas directo a Meta, con tu tarjeta, en tu cuenta. Tú decides cuánto
y tú lo controlas. Nosotros no tocamos ese dinero.

Y para ser transparente con la condición: el honorario de ochenta y nueve nueve
aplica para presupuestos de pauta por debajo de quinientos mil pesos al mes.
Si tú decides invertir más que eso, recalculamos el honorario según el volumen —
porque gestionar más pauta es más trabajo. Te lo digo ahora, no después."
-->

---

<!-- _class: close -->

## Tu siguiente paso son 15 minutos

<div class="sub">Un diagnóstico corto, sin compromiso, para saber qué necesita <strong style="color:#fff">tu</strong> negocio.</div>

<div class="cols">
<div>
<ul>
<li><strong>Escribe “DIAGNÓSTICO” en el chat de Zoom</strong> y agendamos ahora mismo</li>
<li>Revisamos tu oferta y definimos si te sirve <strong>Producto, Negocio o Plan 360</strong></li>
<li>Quien agende hoy entra con <strong>prioridad de implementación</strong></li>
<li>Sin compromiso: si no encaja, te lo digo de frente</li>
</ul>
</div>
<div class="card hero" style="align-self:center">
<div class="tag gold">Plan 360 · Recomendado</div>
<span class="note">Inversión de implementación</span>
<span class="price" style="color:#92400e">$475.200 COP</span>
<span class="fee" style="color:#92400e">+ $89.900 COP / mes</span>
<p style="margin-top:12px;color:#78350f">Producto + Negocio integrados,<br>con 20% de descuento aplicado.</p>
</div>
</div>

<!--
GUION DEL ORADOR — Llamado a la Acción (90 seg · CIERRE)

"Entonces, ¿cuál es tu siguiente paso? No es firmar nada hoy. Son quince minutos.

Lo que quiero que hagas AHORA, mientras seguimos aquí, es escribir una sola
palabra en el chat de Zoom: DIAGNÓSTICO. Con eso reservo tu espacio.

En esos quince minutos hacemos tres cosas concretas:
Revisamos tu oferta real — qué vendes y a quién.
Definimos cuál de las tres opciones te sirve. Y ojo: a veces la respuesta es
que te sirve solo el de Producto, y te lo voy a decir. No te voy a empujar al 360
si no lo necesitas.
Y si encaja, arrancamos con prioridad de implementación para quien agende hoy.

Te recuerdo el número de la opción completa, para que lo tengas presente:
cuatrocientos setenta y cinco mil doscientos de implementación, ochenta y nueve
mil novecientos al mes. Producto y Negocio integrados, con el veinte por ciento
ya aplicado.

[MIRA A LA CÁMARA. Pausa.]

Y quiero cerrar con lo mismo que abrí: no estás comprando una página web.
Estás dejando de ser el único que puede explicar tu negocio.

Escribe DIAGNÓSTICO en el chat y lo vemos hoy mismo.
¿Qué preguntas te quedaron?"

[ABRE Q&A. Deja la diapositiva proyectada — el precio y el CTA quedan a la vista
 durante toda la ronda de preguntas.]
-->
