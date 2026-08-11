from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas
from pathlib import Path
from PIL import Image


ROOT = Path(r"D:\Proyectos multi agentes\PartnerHub")
OUTPUT = ROOT / "output" / "pdf" / "partnerhub-plan-360-carta-de-venta-con-preview.pdf"
PRODUCT_IMG = ROOT / "brain" / "business" / "pagina de producto.png"
BUSINESS_IMG = ROOT / "brain" / "business" / "pagina de negocio.png"
PREVIEW_DIR = ROOT / "tmp" / "pdfs" / "assets"

PAGE_W, PAGE_H = A4

COLORS = {
    "bg": HexColor("#07101c"),
    "panel": HexColor("#0d1730"),
    "panel2": HexColor("#101d3c"),
    "line": HexColor("#1d315c"),
    "cyan": HexColor("#67ecff"),
    "pink": HexColor("#ff46c4"),
    "lime": HexColor("#a7ff7a"),
    "text": HexColor("#eef4ff"),
    "muted": HexColor("#aeb8d2"),
    "soft": HexColor("#8190b3"),
}


def setup_page(c, title="PartnerHub - Plan 360"):
    c.setTitle(title)
    c.setAuthor("Codex para Jairo Pinto")
    c.setSubject("Carta de venta - Plan 360")
    c.setFillColor(COLORS["bg"])
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setStrokeColor(COLORS["line"])
    c.roundRect(22, 22, PAGE_W - 44, PAGE_H - 44, 20, fill=0, stroke=1)


def glow_box(c, x, y, w, h, fill, stroke=None, radius=18):
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, radius, fill=1, stroke=0)


def draw_label(c, x, y, text, color=None, bg=None):
    color = color or COLORS["cyan"]
    bg = bg or HexColor("#112341")
    width = 8 + len(text) * 5.8
    c.setFillColor(bg)
    c.setStrokeColor(HexColor("#23416e"))
    c.roundRect(x, y - 4, width, 18, 9, fill=1, stroke=1)
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(x + 8, y + 1, text.upper())
    return width


def draw_wrapped(c, text, x, y, width, font="Helvetica", size=12, color=None, leading=None):
    color = color or COLORS["text"]
    leading = leading or size * 1.35
    c.setFillColor(color)
    c.setFont(font, size)
    lines = simpleSplit(text, font, size, width)
    yy = y
    for line in lines:
        c.drawString(x, yy, line)
        yy -= leading
    return yy


def draw_bullets(c, items, x, y, width, size=12, bullet_color=None, text_color=None, gap=10):
    bullet_color = bullet_color or COLORS["lime"]
    text_color = text_color or COLORS["muted"]
    yy = y
    for item in items:
        lines = simpleSplit(item, "Helvetica", size, width - 18)
        c.setFillColor(bullet_color)
        c.circle(x + 4, yy + 4, 3, fill=1, stroke=0)
        c.setFillColor(text_color)
        c.setFont("Helvetica", size)
        line_y = yy
        for line in lines:
            c.drawString(x + 16, line_y, line)
            line_y -= size * 1.35
        yy = line_y - gap
    return yy


def price_box(c, x, y, w, h, title, subtitle, price, bullets, featured=False):
    fill = COLORS["panel2"] if featured else COLORS["panel"]
    stroke = COLORS["pink"] if featured else COLORS["line"]
    glow_box(c, x, y - h, w, h, fill, stroke)
    draw_label(c, x + 16, y - 18, title, color=COLORS["text"], bg=HexColor("#15294a"))
    c.setFillColor(COLORS["soft"])
    c.setFont("Helvetica", 8)
    c.drawString(x + 16, y - 38, subtitle.upper())
    c.setFillColor(COLORS["text"])
    c.setFont("Helvetica-Bold", 24)
    c.drawString(x + 16, y - 78, price)
    draw_bullets(c, bullets, x + 16, y - 106, w - 32, size=10.5, gap=7)


def footer(c, page_no):
    c.setStrokeColor(COLORS["line"])
    c.line(34, 34, PAGE_W - 34, 34)
    c.setFont("Helvetica", 9)
    c.setFillColor(COLORS["soft"])
    c.drawString(38, 20, "PartnerHub - Carta de venta comercial")
    c.drawRightString(PAGE_W - 38, 20, f"Página {page_no}")


def prepare_preview(source: Path, target: Path, crop_ratio: float, anchor: str = "top"):
    target.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(source).convert("RGB")
    width, height = image.size
    crop_h = int(height * crop_ratio)
    if anchor == "top":
        box = (0, 0, width, crop_h)
    else:
        box = (0, height - crop_h, width, height)
    cropped = image.crop(box)
    cropped.save(target)
    return target


def draw_preview_frame(c, x, y_top, w, h, image_path: Path, domain: str, label: str):
    draw_label(c, x, y_top + 10, label, bg=HexColor("#14284b"))
    shell_y = y_top - h
    glow_box(c, x, shell_y, w, h, COLORS["panel"], COLORS["line"], radius=18)
    c.drawImage(str(image_path), x + 8, shell_y + 8, width=w - 16, height=h - 16, preserveAspectRatio=False, mask='auto')
    c.setFillColor(COLORS["text"])
    c.setFont("Helvetica-Bold", 8.5)
    c.drawRightString(x + w - 10, shell_y + 12, domain)


def page_one(c):
    setup_page(c)
    draw_label(c, 48, PAGE_H - 60, "Franquicia Digital - Plan 360", bg=HexColor("#132744"))
    c.setFillColor(COLORS["text"])
    c.setFont("Helvetica-Bold", 28)
    c.drawString(48, PAGE_H - 106, "Tu negocio no necesita")
    c.setFillColor(COLORS["cyan"])
    c.drawString(48, PAGE_H - 140, "más piezas sueltas.")
    c.setFillColor(COLORS["text"])
    c.drawString(48, PAGE_H - 174, "Necesita una estructura completa.")

    draw_wrapped(
        c,
        "Si hoy presentas tu producto, tu oportunidad y tu captación por separado, estás creciendo con más fricción de la necesaria.",
        48,
        PAGE_H - 214,
        470,
        size=13,
        color=COLORS["muted"],
    )

    glow_box(c, 48, PAGE_H - 480, 250, 184, COLORS["panel"], COLORS["line"])
    draw_label(c, 66, PAGE_H - 320, "Lo que hoy te desgasta", bg=HexColor("#14284b"))
    draw_bullets(
        c,
        [
            "Repites la misma explicación una y otra vez.",
            "Tu prospecto recibe piezas sin orden ni contexto.",
            "Tu negocio se ve menos sólido de lo que realmente es.",
            "Tu crecimiento depende demasiado de ti.",
        ],
        66,
        PAGE_H - 348,
        214,
        size=10.5,
        gap=7,
    )

    glow_box(c, 316, PAGE_H - 480, 232, 184, COLORS["panel2"], COLORS["pink"])
    draw_label(c, 334, PAGE_H - 320, "Lo que cambia", color=HexColor("#ffc7f0"), bg=HexColor("#2a1432"))
    draw_wrapped(
        c,
        "Con el Plan 360 tu producto, tu negocio y tu captación nacen conectados desde el primer día.",
        334,
        PAGE_H - 350,
        190,
        font="Helvetica-Bold",
        size=14,
        color=COLORS["text"],
    )
    draw_bullets(
        c,
        [
            "Una sola estructura.",
            "Una sola estrategia.",
            "Un solo acompañamiento.",
        ],
        334,
        PAGE_H - 420,
        190,
        size=10.5,
        gap=6,
    )

    glow_box(c, 48, 70, PAGE_W - 96, 108, HexColor("#0b1428"), COLORS["line"])
    draw_label(c, 66, 148, "Mensaje central", bg=HexColor("#14284b"))
    draw_wrapped(
        c,
        "No estás comprando tres servicios. Estás obteniendo una estructura completa de trabajo: todo integrado, todo conectado y todo listo para comenzar.",
        66,
        122,
        PAGE_W - 140,
        size=13,
        font="Helvetica-Bold",
        color=COLORS["text"],
    )
    footer(c, 1)
    c.showPage()


def page_two(c):
    setup_page(c)
    draw_label(c, 48, PAGE_H - 60, "La decisión inteligente", bg=HexColor("#132744"))
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(COLORS["text"])
    c.drawString(48, PAGE_H - 100, "Plan 360")
    c.setFont("Helvetica", 14)
    c.setFillColor(COLORS["muted"])
    c.drawString(48, PAGE_H - 122, "Todo listo desde el primer día.")
    draw_wrapped(
        c,
        "Estas previews corresponden a la versión profesional: producto y negocio ya funcionando como una sola historia comercial.",
        48,
        PAGE_H - 146,
        500,
        size=11.3,
        color=COLORS["muted"],
    )

    product_preview = prepare_preview(PRODUCT_IMG, PREVIEW_DIR / "producto-preview.png", 0.18, "top")
    business_preview = prepare_preview(BUSINESS_IMG, PREVIEW_DIR / "negocio-preview.png", 0.22, "top")
    draw_preview_frame(c, 48, PAGE_H - 190, 242, 168, product_preview, "claudiacalero.pro", "Producto profesional")
    draw_preview_frame(c, 306, PAGE_H - 190, 242, 168, business_preview, "nexus.claudiacalero.pro", "Negocio profesional")

    glow_box(c, 48, PAGE_H - 410, 250, 204, COLORS["panel"], COLORS["line"])
    draw_label(c, 66, PAGE_H - 430, "Valor por separado", bg=HexColor("#14284b"))
    rows = [
        ("Producto Profesional", "$397.000"),
        ("Negocio Profesional", "$497.000"),
        ("Motor de Prospectos", "$297.000"),
    ]
    yy = PAGE_H - 460
    c.setFont("Helvetica", 11.5)
    for label, value in rows:
        c.setFillColor(COLORS["muted"])
        c.drawString(66, yy, label)
        c.setFillColor(COLORS["text"])
        c.drawRightString(280, yy, value)
        c.setStrokeColor(COLORS["line"])
        c.line(66, yy - 10, 280, yy - 10)
        yy -= 38
    c.setFillColor(COLORS["soft"])
    c.setFont("Helvetica-Bold", 10)
    c.drawString(66, yy - 6, "VALOR POR SEPARADO")
    c.setStrokeColor(COLORS["pink"])
    c.setLineWidth(2)
    c.line(66, yy - 34, 186, yy - 34)
    c.setFillColor(COLORS["text"])
    c.setFont("Helvetica-Bold", 24)
    c.drawString(66, yy - 40, "$1.191.000")

    glow_box(c, 316, PAGE_H - 410, 232, 248, COLORS["panel2"], COLORS["pink"])
    draw_label(c, 334, PAGE_H - 430, "Más recomendado", color=HexColor("#ffc7f0"), bg=HexColor("#2a1432"))
    c.setFillColor(COLORS["soft"])
    c.setFont("Helvetica-Bold", 10)
    c.drawString(334, PAGE_H - 465, "HOY")
    c.setFillColor(COLORS["text"])
    c.setFont("Helvetica-Bold", 26)
    c.drawString(334, PAGE_H - 497, "PLAN 360")
    c.setFillColor(COLORS["cyan"])
    c.setFont("Helvetica-Bold", 34)
    c.drawString(334, PAGE_H - 543, "$897.000")
    draw_wrapped(
        c,
        "No vale la pena comprar todo por separado cuando puedes empezar con una estructura completa y mejor conectada.",
        334,
        PAGE_H - 579,
        188,
        size=12.5,
        color=COLORS["muted"],
    )

    draw_label(c, 48, PAGE_H - 648, "Incluye", bg=HexColor("#14284b"))
    draw_bullets(
        c,
        [
            "Ecosistema Producto Profesional",
            "Ecosistema Negocio Profesional",
            "Configuración inicial del Motor de Prospectos",
            "Dominio",
            "Publicación",
            "Configuración inicial",
            "Todo conectado desde el primer día",
        ],
        48,
        PAGE_H - 676,
        500,
        size=11,
        gap=7,
    )

    footer(c, 2)
    c.showPage()


def page_three(c):
    setup_page(c)
    draw_label(c, 48, PAGE_H - 60, "Continuidad del crecimiento", bg=HexColor("#132744"))
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(COLORS["text"])
    c.drawString(48, PAGE_H - 100, "Gestión mensual de crecimiento")
    c.setFillColor(COLORS["cyan"])
    c.setFont("Helvetica-Bold", 30)
    c.drawString(48, PAGE_H - 142, "$89.900 / mes")
    draw_wrapped(
        c,
        "No es mantenimiento pasivo. Es la inversión mensual que mantiene, mejora y hace evolucionar todo tu ecosistema comercial.",
        48,
        PAGE_H - 176,
        470,
        size=12.5,
        color=COLORS["muted"],
    )

    glow_box(c, 48, PAGE_H - 460, 250, 214, COLORS["panel"], COLORS["line"])
    draw_label(c, 66, PAGE_H - 280, "Incluye", bg=HexColor("#14284b"))
    draw_bullets(
        c,
        [
            "Hosting",
            "Dominio",
            "Actualizaciones",
            "Mejoras continuas",
            "Soporte",
            "Evolución del ecosistema",
        ],
        66,
        PAGE_H - 308,
        210,
        size=10.8,
        gap=7,
    )

    glow_box(c, 316, PAGE_H - 460, 232, 214, COLORS["panel2"], COLORS["pink"])
    draw_label(c, 334, PAGE_H - 280, "Para quién tiene más sentido", color=HexColor("#ffc7f0"), bg=HexColor("#2a1432"))
    draw_bullets(
        c,
        [
            "Para empresarios que no quieren empezar a medias.",
            "Para líderes que ya no quieren improvisar su mensaje.",
            "Para quien quiere vender, organizar y captar con una sola lógica.",
        ],
        334,
        PAGE_H - 308,
        188,
        size=10.5,
        gap=7,
    )

    glow_box(c, 48, 72, PAGE_W - 96, 126, HexColor("#0d1730"), COLORS["line"])
    draw_label(c, 66, 168, "Llamado a la acción", bg=HexColor("#14284b"))
    draw_wrapped(
        c,
        "Si quieres descubrir si esta es la ruta correcta para tu negocio, escribe hoy mismo a Jairo Pinto por WhatsApp.",
        66,
        138,
        PAGE_W - 140,
        size=13,
        color=COLORS["text"],
        font="Helvetica-Bold",
    )
    c.setFillColor(COLORS["cyan"])
    c.setFont("Helvetica-Bold", 18)
    c.drawString(66, 96, "WhatsApp: 318 843 0283")
    c.linkURL("https://wa.me/573188430283", (66, 88, 262, 116), relative=0)
    c.setFillColor(COLORS["muted"])
    c.setFont("Helvetica", 11)
    c.drawString(66, 74, "Mensaje sugerido: Quiero conocer la ruta correcta de Franquicia Digital para mi negocio.")

    footer(c, 3)
    c.showPage()


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    page_one(c)
    page_two(c)
    page_three(c)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
