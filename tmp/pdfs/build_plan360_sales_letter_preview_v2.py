from pathlib import Path
from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

ROOT = Path(r"D:\Proyectos multi agentes\PartnerHub")
OUT = ROOT / "output" / "pdf" / "partnerhub-plan-360-carta-de-venta-preview-v2.pdf"
PRODUCT = ROOT / "brain" / "business" / "pagina de producto.png"
BUSINESS = ROOT / "brain" / "business" / "pagina de negocio.png"
ASSETS = ROOT / "tmp" / "pdfs" / "assets_v2"

W, H = A4
BG = HexColor("#07101c")
PANEL = HexColor("#101b36")
LINE = HexColor("#1f3764")
CYAN = HexColor("#67ecff")
PINK = HexColor("#ff46c4")
TEXT = HexColor("#eef4ff")
MUTED = HexColor("#b1bad3")
LIME = HexColor("#a7ff7a")


def crop(source: Path, target: Path, ratio: float):
    target.parent.mkdir(parents=True, exist_ok=True)
    img = Image.open(source).convert("RGB")
    w, h = img.size
    img.crop((0, 0, w, int(h * ratio))).save(target)
    return target


def page(c):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setStrokeColor(LINE)
    c.roundRect(20, 20, W - 40, H - 40, 20, fill=0, stroke=1)


def pill(c, x, y, text, fg=CYAN, bg=HexColor("#132744"), stroke=HexColor("#28497f")):
    width = 16 + len(text) * 5.4
    c.setFillColor(bg)
    c.setStrokeColor(stroke)
    c.roundRect(x, y - 4, width, 18, 9, fill=1, stroke=1)
    c.setFillColor(fg)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(x + 8, y + 1, text.upper())
    return width


def wrap(c, text, x, y, width, size=12, color=MUTED, font="Helvetica", leading=None):
    leading = leading or size * 1.32
    c.setFillColor(color)
    c.setFont(font, size)
    for line in simpleSplit(text, font, size, width):
        c.drawString(x, y, line)
        y -= leading
    return y


def bullets(c, items, x, y, width, size=11, gap=8):
    yy = y
    for item in items:
        lines = simpleSplit(item, "Helvetica", size, width - 18)
        c.setFillColor(LIME)
        c.circle(x + 4, yy + 3, 3, fill=1, stroke=0)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", size)
        line_y = yy
        for line in lines:
            c.drawString(x + 16, line_y, line)
            line_y -= size * 1.3
        yy = line_y - gap


def preview(c, x, y_top, w, h, img_path: Path, title: str, domain: str, stroke=LINE):
    pill(c, x, y_top + 8, title)
    y = y_top - h
    c.setFillColor(PANEL)
    c.setStrokeColor(stroke)
    c.roundRect(x, y, w, h, 16, fill=1, stroke=1)
    c.drawImage(str(img_path), x + 8, y + 8, width=w - 16, height=h - 26, preserveAspectRatio=False, mask='auto')
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(x + w - 10, y + 10, domain)


def build():
    ASSETS.mkdir(parents=True, exist_ok=True)
    prod = crop(PRODUCT, ASSETS / "producto.png", 0.22)
    neg = crop(BUSINESS, ASSETS / "negocio.png", 0.26)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4)

    page(c)
    pill(c, 44, H - 56, "Plan 360")
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(44, H - 100, "No empieces por partes.")
    c.setFillColor(CYAN)
    c.drawString(44, H - 136, "Empieza con una estructura completa.")
    wrap(
        c,
        "Esta carta muestra cómo se ve una implementación profesional: producto, negocio y captación trabajando con una sola lógica comercial.",
        44, H - 172, 500, size=12.5
    )

    preview(c, 44, H - 228, 242, 170, prod, "Producto profesional", "claudiacalero.pro")
    preview(c, 308, H - 228, 242, 170, neg, "Negocio profesional", "nexus.claudiacalero.pro", stroke=PINK)

    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(44, 270, 242, 190, 18, fill=1, stroke=1)
    pill(c, 62, 442, "Valor por separado")
    c.setFont("Helvetica", 11.5)
    rows = [("Producto Profesional", "$397.000"), ("Negocio Profesional", "$497.000"), ("Motor de Prospectos", "$297.000")]
    yy = 402
    for name, price in rows:
        c.setFillColor(MUTED)
        c.drawString(62, yy, name)
        c.setFillColor(TEXT)
        c.drawRightString(268, yy, price)
        c.setStrokeColor(LINE)
        c.line(62, yy - 10, 268, yy - 10)
        yy -= 38
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(62, yy - 2, "VALOR POR SEPARADO")
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(62, yy - 38, "$1.191.000")
    c.setStrokeColor(PINK)
    c.setLineWidth(2)
    c.line(62, yy - 30, 182, yy - 30)

    c.setFillColor(PANEL)
    c.setStrokeColor(PINK)
    c.roundRect(308, 270, 242, 190, 18, fill=1, stroke=1)
    pill(c, 326, 442, "Más recomendado", fg=HexColor("#ffd1f4"), bg=HexColor("#2a1432"), stroke=PINK)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(326, 396, "HOY")
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(326, 360, "PLAN 360")
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 34)
    c.drawString(326, 312, "$897.000")
    wrap(c, "No estás comprando tres servicios. Estás tomando la decisión más inteligente para empezar bien.", 326, 274, 198, size=12)

    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(44, 72, 506, 160, 18, fill=1, stroke=1)
    pill(c, 62, 210, "Incluye")
    bullets(c, [
        "Presenta tus productos profesionalmente.",
        "Explica tu negocio sin repetir el mismo discurso.",
        "Empieza a generar prospectos desde una estructura organizada.",
        "Todo conectado desde el primer día.",
        "Una sola implementación, una sola estrategia y un solo acompañamiento.",
        "Gestión mensual de crecimiento: $89.900 / mes.",
    ], 62, 178, 470, size=11, gap=6)

    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(44, 40, "WhatsApp: 318 843 0283")
    c.linkURL("https://wa.me/573188430283", (44, 34, 220, 48), relative=0)

    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
