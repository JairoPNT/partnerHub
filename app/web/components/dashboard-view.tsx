"use client";

import { useState } from "react";
import {
  TrendingUp,
  Users,
  Shield,
  Layers,
  Sparkles,
  Plus,
  Compass,
  LayoutGrid,
  Info,
  CheckCircle,
  FileText,
  AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Label, Input, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";

interface Partner {
  id: string;
  name: string;
  email: string;
  status: "success" | "warning" | "error" | "neutral";
  plan: string;
  volume: string;
  date: string;
}

export function AdminDashboardPrototype() {
  const [partners, setPartners] = useState<Partner[]>([
    {
      id: "P-1093",
      name: "Andrés Mendoza",
      email: "andres.mendoza@email.com",
      status: "success",
      plan: "Growth Configuration",
      volume: "$12,450 USD",
      date: "2026-07-01"
    },
    {
      id: "P-1092",
      name: "Diana Carolina Ruíz",
      email: "diana.ruiz@email.com",
      status: "success",
      plan: "Full Ecosystem",
      volume: "$24,900 USD",
      date: "2026-06-28"
    },
    {
      id: "P-1091",
      name: "Carlos Mario Ortiz",
      email: "carlos.ortiz@email.com",
      status: "warning",
      plan: "Starter Configuration",
      volume: "$1,200 USD",
      date: "2026-06-25"
    },
    {
      id: "P-1090",
      name: "Beatriz Helena Villa",
      email: "beatriz.villa@email.com",
      status: "error",
      plan: "Sin Actividad",
      volume: "$0 USD",
      date: "2026-06-18"
    }
  ]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    plan: "Starter Configuration"
  });

  const [showNotification, setShowNotification] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    const newPartner: Partner = {
      id: `P-${Math.floor(1000 + Math.random() * 9000)}`,
      name: form.name,
      email: form.email,
      status: "success",
      plan: form.plan,
      volume: "$0 USD",
      date: new Date().toISOString().split("T")[0]
    };

    setPartners([newPartner, ...partners]);
    setForm({ name: "", email: "", plan: "Starter Configuration" });
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title section */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Admin / Internal Operations
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">
            Resumen técnico y administrativo de socios, dominios y sitios web.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="primary" className="py-1 px-3">
            Tenant: Generic Prototype
          </Badge>
        </div>
      </section>

      {/* Notifications */}
      {showNotification && (
        <Alert variant="success" icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} title="Operación Exitosa">
          El nuevo socio ha sido registrado temporalmente en la memoria del prototipo de UI.
        </Alert>
      )}

      {/* KPI Cards Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card interactive>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Socios Activos</span>
            <Users className="h-4 w-4 text-sand-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900 font-heading">1,482</div>
            <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
              <TrendingUp className="h-3 w-3" /> +12% este mes
            </p>
          </CardContent>
        </Card>

        <Card interactive>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Sitios Duplicados</span>
            <Layers className="h-4 w-4 text-sand-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900 font-heading">412</div>
            <p className="mt-1 text-[11px] text-stone-500">98% con SSL activo</p>
          </CardContent>
        </Card>

        <Card interactive>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Dominios Conectados</span>
            <Compass className="h-4 w-4 text-sand-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900 font-heading">98</div>
            <p className="mt-1 text-[11px] text-emerald-600 font-semibold">+4 pendientes</p>
          </CardContent>
        </Card>

        <Card interactive>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Conversión VSL</span>
            <Shield className="h-4 w-4 text-sand-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900 font-heading">4.82%</div>
            <p className="mt-1 text-[11px] text-stone-500">Promedio global de landings</p>
          </CardContent>
        </Card>
      </section>

      {/* Main Operations Split */}
      <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        {/* Table Card */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Socios Recientes</CardTitle>
              <CardDescription>Visualización y estado operativo del catálogo de socios.</CardDescription>
            </div>
            <Badge variant="secondary">Filtrado por: Recientes</Badge>
          </CardHeader>
          <CardContent className="flex-1 mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID / Nombre</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Volumen</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div className="font-semibold text-stone-900">{partner.name}</div>
                      <div className="text-[11px] text-stone-400">{partner.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-stone-700">{partner.plan}</div>
                      <div className="text-[10px] text-stone-400">Registrado: {partner.date}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.status}>{partner.status}</Badge>
                    </TableCell>
                    <TableCell className="font-heading font-medium text-stone-850 text-xs">
                      {partner.volume}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        Ver ficha
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Input Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Registrar Socio</CardTitle>
            <CardDescription>Formulario interactivo para simular el alta de socios al ecosistema.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Juan Pérez"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Ej. juan.perez@partnerhub.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan">Plan Seleccionado</Label>
              <Select
                id="plan"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
              >
                <option value="Starter Configuration">Starter Configuration</option>
                <option value="Growth Configuration">Growth Configuration</option>
                <option value="Full Ecosystem">Full Ecosystem</option>
              </Select>
            </div>

            <Alert variant="info" className="mt-2" icon={<AlertCircle className="h-4 w-4 text-blue-600" />}>
              Este formulario no altera la base de datos de producción; simula estados puramente a nivel de interfaz.
            </Alert>

            <Button type="submit" variant="primary" className="w-full mt-2" leftIcon={<Plus className="h-4 w-4" />}>
              Añadir Socio al Sistema
            </Button>
          </form>
        </Card>
      </section>

      {/* Design System Foundation Showcase Panel */}
      <section className="rounded-3xl border border-stone-200 bg-white/70 p-6 shadow-subtle backdrop-blur-md">
        <div className="flex items-center gap-2 pb-4 border-b border-stone-100">
          <Sparkles className="h-5 w-5 text-sand-500" />
          <div>
            <h3 className="font-heading text-base font-semibold text-stone-900">
              Showcase del Sistema de Diseño (PH-006)
            </h3>
            <p className="text-xs text-stone-500">Muestra interactiva de los tokens de color, tipografía y componentes base creados.</p>
          </div>
        </div>

        <div className="grid gap-6 mt-6 md:grid-cols-3">
          {/* Typography Tokens */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Escala Tipográfica</h4>
            <div className="space-y-2 p-4 bg-stone-50/50 rounded-2xl border border-stone-250/40">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-stone-900">Outfit Bold (Heading)</h1>
              <p className="font-sans text-sm font-medium text-stone-700">Inter Medium (Cuerpo de texto)</p>
              <p className="font-sans text-xs text-stone-500">Inter Regular (Descripciones secundarias)</p>
              <p className="font-mono text-[10px] text-stone-400">Monospace (Variables / IDs del sistema)</p>
            </div>
          </div>

          {/* Color Tokens */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Paleta de Colores</h4>
            <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50/50 rounded-2xl border border-stone-250/40">
              <div className="rounded-xl bg-stone-900 p-2 text-[10px] font-semibold text-white">
                Stone-900 (Fondo Primario)
              </div>
              <div className="rounded-xl bg-sand-100 border border-sand-200/50 p-2 text-[10px] font-semibold text-sand-800">
                Sand-100 (Acento Principal)
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200/50 p-2 text-[10px] font-semibold text-emerald-700">
                Emerald (Éxito)
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200/50 p-2 text-[10px] font-semibold text-amber-700">
                Amber (Advertencia)
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-200/50 p-2 text-[10px] font-semibold text-rose-700">
                Rose (Error)
              </div>
              <div className="rounded-xl bg-stone-50 border border-stone-200/50 p-2 text-[10px] font-semibold text-stone-500">
                Stone-50 (Neutral)
              </div>
            </div>
          </div>

          {/* Button Variant Showcase */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Variantes de Botón</h4>
            <div className="flex flex-wrap gap-2 p-3 bg-stone-50/50 rounded-2xl border border-stone-250/40">
              <Button variant="primary" size="sm">Primary</Button>
              <Button variant="secondary" size="sm">Secondary</Button>
              <Button variant="outline" size="sm">Outline</Button>
              <Button variant="ghost" size="sm">Ghost</Button>
              <Button variant="danger" size="sm">Danger</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
