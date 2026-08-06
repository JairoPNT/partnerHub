"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Users,
  Award,
  Clock,
  Gift,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  PlusCircle,
  UserPlus,
  Tag,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  Check,
  X,
  AlertTriangle,
  Layers
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ModuleRecord } from "@/modules/catalog";
import { EntrepreneurOperationsView } from "@/components/entrepreneur-operations-view";
import { MasterTemplateReplicationView } from "@/components/master-template-replication-view";
import { ModalPortal } from "@/components/ui/modal-portal";

type PartnersReferralsViewProps = {
  record?: ModuleRecord;
};

type ReferralStatus = "PENDING" | "VALIDATED" | "QUALIFIED" | "REJECTED" | "CANCELLED";

interface ReferralCodeRecord {
  siteId: string;
  code: string;
  displayName: string;
  assignedAt: string;
}

interface ReferralRecord {
  id: string;
  referredSiteId: string;
  referrerCode: string;
  referrerSiteId: string | null;
  status: ReferralStatus;
  createdAt: string;
  validatedAt?: string;
  qualifiedAt?: string;
}

interface SummaryRecord {
  siteId: string;
  qualifiedReferrals: number;
  earnedMonths: number;
}

interface ReferralDataResponse {
  codes: ReferralCodeRecord[];
  referrals: ReferralRecord[];
  summary: SummaryRecord[];
}

interface StatusConfirmationState {
  referralId: string;
  referredSiteId: string;
  targetStatus: ReferralStatus;
}

export function PartnersReferralsView({ record }: PartnersReferralsViewProps) {
  const [activeTab, setActiveTab] = useState<"OPERATIONS" | "REPLICATION" | "REFERRALS">("OPERATIONS");
  const [data, setData] = useState<ReferralDataResponse>({
    codes: [],
    referrals: [],
    summary: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal para operaciones de código / registro manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"ASSIGN_CODE" | "REGISTER_REFERRAL">("ASSIGN_CODE");

  // Form 1: Assign Code State
  const [assignForm, setAssignForm] = useState({
    siteId: "",
    code: "",
    displayName: ""
  });
  const [isAssigning, setIsAssigning] = useState(false);

  // Form 2: Register Referral State
  const [referralForm, setReferralForm] = useState({
    referredSiteId: "",
    referrerCode: ""
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [unrecognizedCodeNotice, setUnrecognizedCodeNotice] = useState<string | null>(null);

  // Status Action State
  const [confirmation, setConfirmation] = useState<StatusConfirmationState | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchReferralData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/internal/referrals");
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo cargar la información de referidos.");
      }

      setData(json);
    } catch (err: any) {
      setErrorMessage(err.message || "Error de conexión al cargar los referidos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  // Handlers for Form 1 (Assign Code)
  const handleAssignCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!assignForm.siteId.trim() || !assignForm.code.trim() || !assignForm.displayName.trim()) {
      setErrorMessage("Todos los campos del formulario de asignación de código son obligatorios.");
      return;
    }

    setIsAssigning(true);

    try {
      const response = await fetch("/api/internal/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: assignForm.siteId.trim().toLowerCase(),
          code: assignForm.code.trim().toUpperCase(),
          displayName: assignForm.displayName.trim()
        })
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo asignar el código de referido.");
      }

      setSuccessMessage(`Código ${json.code} asignado correctamente a ${json.displayName}.`);
      setAssignForm({ siteId: "", code: "", displayName: "" });
      fetchReferralData();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al registrar el código.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Handlers for Form 2 (Register Referral)
  const handleRegisterReferralSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setUnrecognizedCodeNotice(null);

    if (!referralForm.referredSiteId.trim() || !referralForm.referrerCode.trim()) {
      setErrorMessage("Todos los campos para registrar el referido son obligatorios.");
      return;
    }

    setIsRegistering(true);

    try {
      const response = await fetch("/api/internal/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referredSiteId: referralForm.referredSiteId.trim().toLowerCase(),
          referrerCode: referralForm.referrerCode.trim().toUpperCase()
        })
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo registrar el referido.");
      }

      if (json.codeFound === false) {
        setUnrecognizedCodeNotice(
          `El código "${referralForm.referrerCode.toUpperCase()}" no pertenece a un sitio registrado aún. El referido ha sido guardado con estado PENDING para revisión posterior.`
        );
      } else {
        setSuccessMessage(`Referido ${json.referredSiteId} registrado con éxito bajo el código ${json.referrerCode}.`);
      }

      setReferralForm({ referredSiteId: "", referrerCode: "" });
      fetchReferralData();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al registrar el referido.");
    } finally {
      setIsRegistering(false);
    }
  };

  // Handlers for Status Change
  const requestStatusChange = (referralId: string, referredSiteId: string, targetStatus: ReferralStatus) => {
    setConfirmation({
      referralId,
      referredSiteId,
      targetStatus
    });
  };

  const confirmStatusChange = async () => {
    if (!confirmation) return;

    setIsUpdatingStatus(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/internal/referrals/${confirmation.referralId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: confirmation.targetStatus })
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo actualizar el estado del referido.");
      }

      setSuccessMessage(`Estado del referido ${json.referredSiteId} actualizado a ${json.status}.`);
      setConfirmation(null);
      fetchReferralData();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al cambiar estado.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Calculations
  const totalAssignedCodes = data.codes.length;
  const pendingReferrals = data.referrals.filter((r) => r.status === "PENDING").length;
  const qualifiedReferrals = data.referrals.filter((r) => r.status === "QUALIFIED").length;
  const totalEarnedMonths = data.summary.reduce((acc, curr) => acc + curr.earnedMonths, 0);

  // Status Badge Helper
  const renderStatusBadge = (status: ReferralStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pendiente</Badge>;
      case "VALIDATED":
        return <Badge variant="secondary">Validado</Badge>;
      case "QUALIFIED":
        return <Badge variant="success">Calificado</Badge>;
      case "REJECTED":
        return <Badge variant="error">Rechazado</Badge>;
      case "CANCELLED":
        return <Badge variant="neutral">Cancelado</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Find Owner Name for Code
  const getOwnerDisplayName = (codeStr: string, referrerSiteId: string | null) => {
    const codeMatch = data.codes.find((c) => c.code === codeStr);
    if (codeMatch) return `${codeMatch.displayName} (${codeMatch.siteId})`;
    if (referrerSiteId) return referrerSiteId;
    return "Sin asignar";
  };

  return (
    <div className="space-y-8">
      {/* Header del módulo con Selector de Pestañas */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900">
              {record?.group || "Core"}
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Gestión de Partners y Operaciones
            </span>
          </div>
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl font-heading">
          Gestión de Empresarios y Referidos
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Control central de solicitudes de activación (PH-009), estado de onboarding, vinculación de sitios y administración del programa de referidos.
        </p>

        {/* Control de Pestañas */}
        <div className="mt-6 flex border-b border-slate-200 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("OPERATIONS")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "OPERATIONS"
                ? "border-cyan-600 text-cyan-950 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users className="h-4 w-4 text-cyan-600" />
            <span>Operación de Empresarios (Activation Leads)</span>
          </button>

          <button
            onClick={() => setActiveTab("REPLICATION")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "REPLICATION"
                ? "border-cyan-600 text-cyan-950 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4 text-cyan-600" />
            <span>Plantilla Maestra y Replicación</span>
          </button>

          <button
            onClick={() => setActiveTab("REFERRALS")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "REFERRALS"
                ? "border-cyan-600 text-cyan-950 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Gift className="h-4 w-4 text-cyan-600" />
            <span>Programa de Referidos</span>
          </button>
        </div>
      </section>

      {/* RENDERIZADO DE PESTAÑA ACTIVA */}
      {activeTab === "OPERATIONS" ? (
        <EntrepreneurOperationsView />
      ) : activeTab === "REPLICATION" ? (
        <MasterTemplateReplicationView />
      ) : (
        <div className="space-y-8">
          {/* Nota Interna Obligatoria */}
          <Alert variant="info" title="Regla Operativa Interna" icon={<ShieldAlert className="h-5 w-5 text-cyan-600" />}>
            El beneficio por referidos se valida y aplica manualmente en la cuenta del empresario. No representa un pago en efectivo ni aplica descuentos o cobros automáticos.
          </Alert>

      {/* Mensajes de Alerta */}
      {errorMessage && (
        <Alert variant="error" title="Error Operativo" icon={<AlertCircle className="h-5 w-5 text-rose-600" />}>
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Operación Exitosa" icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}>
          {successMessage}
        </Alert>
      )}

      {unrecognizedCodeNotice && (
        <Alert variant="warning" title="Código No Asignado Previamente" icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}>
          {unrecognizedCodeNotice}
        </Alert>
      )}

      {/* Resumen Superior de Métricas */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Códigos Asignados
            </CardTitle>
            <Tag className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">{totalAssignedCodes}</div>
            <p className="mt-1 text-xs text-slate-500">Empresarios con código activo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Referidos Pendientes
            </CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{pendingReferrals}</div>
            <p className="mt-1 text-xs text-slate-500">Pendientes de revisión/validación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Referidos Calificados
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{qualifiedReferrals}</div>
            <p className="mt-1 text-xs text-slate-500">Empresarios que cumplieron la meta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Meses Ganados Totales
            </CardTitle>
            <Gift className="h-5 w-5 text-cyan-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">{totalEarnedMonths} <span className="text-sm font-normal text-slate-500">meses</span></div>
            <p className="mt-1 text-xs text-slate-500">Calculado a razón de floor(calificados / 2)</p>
          </CardContent>
        </Card>
      </div>

      {/* Meta Visual Informativa de 12 Meses */}
      <Card className="border-cyan-200/80 bg-cyan-50/20 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-cyan-700" />
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Meta Informativa del Programa de Invitación
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Por cada 2 referidos calificados, el empresario obtiene 1 mes de beneficio en su plan PartnerHub. La meta de 12 meses es orientativa.
            </p>
          </div>

          <Badge variant={totalEarnedMonths >= 12 ? "success" : "neutral"} className="text-sm px-3.5 py-1.5 font-mono">
            {totalEarnedMonths >= 12
              ? `Meta superada: ${totalEarnedMonths} meses disponibles`
              : `${totalEarnedMonths} / 12 meses ganados`}
          </Badge>
        </div>

        {/* Barra de progreso */}
        <div className="mt-5">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 transition-all duration-500"
              style={{ width: `${Math.min(100, (totalEarnedMonths / 12) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>0 meses</span>
            <span>6 meses (12 referidos)</span>
            <span>12 meses (24 referidos)</span>
          </div>
        </div>
      </Card>

      {/* BARRA DE REGLAS Y ACCIONES DE PROGRAMA DE REFERIDOS */}
      <Card className="p-6 border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-cyan-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Regla de Bonificación Oficial
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              <strong className="text-cyan-900 font-bold">1 mes de mantenimiento gratis</strong> por cada <strong>2 referidos calificados efectivos</strong>. Las operaciones manuales se gestionan de forma controlada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalMode("ASSIGN_CODE");
                setIsModalOpen(true);
              }}
              leftIcon={<PlusCircle className="h-4 w-4 text-cyan-600" />}
              className="text-xs"
            >
              Asignar Código Manual
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setModalMode("REGISTER_REFERRAL");
                setIsModalOpen(true);
              }}
              leftIcon={<UserPlus className="h-4 w-4" />}
              className="text-xs"
            >
              Registrar Referido Manual
            </Button>
          </div>
        </div>
      </Card>

      {/* MODAL PARA ASIGNACIÓN / REGISTRO DE REFERIDOS */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2.5">
                  {modalMode === "ASSIGN_CODE" ? (
                    <UserPlus className="h-5 w-5 text-cyan-600" />
                  ) : (
                    <Users className="h-5 w-5 text-cyan-600" />
                  )}
                  <h3 className="text-base font-bold text-slate-900">
                    {modalMode === "ASSIGN_CODE"
                      ? "Asignar Código a Empresario"
                      : "Registrar Nuevo Referido"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Subtabs to toggle inside modal */}
              <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setModalMode("ASSIGN_CODE")}
                  className={`flex-1 rounded-lg py-2 transition ${
                    modalMode === "ASSIGN_CODE"
                      ? "bg-white text-slate-900 shadow-sm font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Asignar Código
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode("REGISTER_REFERRAL")}
                  className={`flex-1 rounded-lg py-2 transition ${
                    modalMode === "REGISTER_REFERRAL"
                      ? "bg-white text-slate-900 shadow-sm font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Registrar Referido
                </button>
              </div>

              {modalMode === "ASSIGN_CODE" ? (
                <form
                  onSubmit={async (e) => {
                    await handleAssignCodeSubmit(e);
                    setIsModalOpen(false);
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <Label htmlFor="assignSiteId">ID de Sitio del Empresario (Slug) *</Label>
                    <Input
                      id="assignSiteId"
                      placeholder="ej. dorian-higuita"
                      value={assignForm.siteId}
                      onChange={(e) => setAssignForm((prev) => ({ ...prev, siteId: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignDisplayName">Nombre del Empresario *</Label>
                    <Input
                      id="assignDisplayName"
                      placeholder="ej. Dorian Higuita"
                      value={assignForm.displayName}
                      onChange={(e) => setAssignForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignCode">Código de Invitación *</Label>
                    <Input
                      id="assignCode"
                      placeholder="ej. JP94536693"
                      value={assignForm.code}
                      onChange={(e) => setAssignForm((prev) => ({ ...prev, code: e.target.value }))}
                      className="font-mono uppercase"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isAssigning}
                      leftIcon={<PlusCircle className="h-4 w-4" />}
                    >
                      Asignar y Guardar
                    </Button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    await handleRegisterReferralSubmit(e);
                    setIsModalOpen(false);
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <Label htmlFor="referredSiteId">ID de Sitio del Nuevo Referido (Slug) *</Label>
                    <Input
                      id="referredSiteId"
                      placeholder="ej. jenny-varela"
                      value={referralForm.referredSiteId}
                      onChange={(e) => setReferralForm((prev) => ({ ...prev, referredSiteId: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="referrerCode">Código del Empresario Invitador *</Label>
                    <Input
                      id="referrerCode"
                      placeholder="ej. JP94536693"
                      value={referralForm.referrerCode}
                      onChange={(e) => setReferralForm((prev) => ({ ...prev, referrerCode: e.target.value }))}
                      className="font-mono uppercase"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    Si el código no está asignado previamente, el registro quedará en estado <strong>PENDING</strong> para su posterior validación.
                  </p>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isRegistering}
                      leftIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Registrar Referido
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Diálogo / Confirmación de Cambio de Estado */}
      {confirmation && (
        <Card className="border-amber-300 bg-amber-50/40 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-base font-bold text-slate-900">
                Confirmar Cambio de Estado para `{confirmation.referredSiteId}`
              </h4>
              <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                ¿Estás seguro de cambiar el estado de este referido a{" "}
                <strong className="uppercase text-amber-900">{confirmation.targetStatus}</strong>?
              </p>

              {confirmation.targetStatus === "QUALIFIED" && (
                <div className="mt-3 rounded-xl bg-white p-3 border border-amber-200 text-xs text-slate-600 space-y-1">
                  <p className="font-medium text-emerald-800">
                    Impacto en Beneficios:
                  </p>
                  <p>
                    Al calificar este referido, se sumará al recuento de referidos calificados del empresario invitador.
                    Cada 2 referidos calificados sumarán 1 mes adicional (`floor(calificados / 2)`). No se generará ningún cobro ni descuento automático.
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={confirmStatusChange}
                  isLoading={isUpdatingStatus}
                  leftIcon={<Check className="h-4 w-4" />}
                >
                  Confirmar Cambio
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmation(null)}
                  disabled={isUpdatingStatus}
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabla de Referidos Registrados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />
              <CardTitle>Historial de Referidos Registrados</CardTitle>
            </div>
            <Badge variant="neutral">{data.referrals.length} registros</Badge>
          </div>
          <CardDescription>
            Revisa, valida y califica manualmente cada relación de invitación entre empresarios.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {data.referrals.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No hay referidos registrados aún en el sistema.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código Referente</TableHead>
                  <TableHead>Empresario Referente</TableHead>
                  <TableHead>Sitio Referido</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Calificación</TableHead>
                  <TableHead className="text-right">Acciones de Cambio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-mono font-semibold text-slate-900">
                      {referral.referrerCode}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getOwnerDisplayName(referral.referrerCode, referral.referrerSiteId)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-cyan-900">
                      {referral.referredSiteId}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(referral.createdAt).toLocaleString("es-CO", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>{renderStatusBadge(referral.status)}</TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {referral.qualifiedAt
                        ? new Date(referral.qualifiedAt).toLocaleDateString("es-CO")
                        : referral.validatedAt
                        ? `Validado (${new Date(referral.validatedAt).toLocaleDateString("es-CO")})`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {referral.status !== "VALIDATED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => requestStatusChange(referral.id, referral.referredSiteId, "VALIDATED")}
                            className="text-xs px-2 py-1 h-7"
                          >
                            Validar
                          </Button>
                        )}
                        {referral.status !== "QUALIFIED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => requestStatusChange(referral.id, referral.referredSiteId, "QUALIFIED")}
                            className="text-xs px-2.5 py-1 h-7 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                          >
                            Calificar
                          </Button>
                        )}
                        {referral.status !== "REJECTED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => requestStatusChange(referral.id, referral.referredSiteId, "REJECTED")}
                            className="text-xs px-2 py-1 h-7 text-rose-600 hover:bg-rose-50"
                          >
                            Rechazar
                          </Button>
                        )}
                        {referral.status !== "CANCELLED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => requestStatusChange(referral.id, referral.referredSiteId, "CANCELLED")}
                            className="text-xs px-2 py-1 h-7 text-slate-400 hover:text-slate-700"
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tabla Resumen de Calificados y Meses Ganados por Empresario */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-cyan-600" />
            <CardTitle>Resumen de Beneficios Calculados por Empresario</CardTitle>
          </div>
          <CardDescription>
            Cálculo oficial de meses ganados acumulados por sitio (`floor(referidos calificados / 2)`).
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {data.summary.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No hay empresarios con referidos calificados aún.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sitio del Empresario (Slug)</TableHead>
                  <TableHead>Nombre / Asignación</TableHead>
                  <TableHead className="text-center">Referidos Calificados</TableHead>
                  <TableHead className="text-right">Meses Ganados Calculados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.summary.map((sum) => {
                  const matchCode = data.codes.find((c) => c.siteId === sum.siteId);
                  return (
                    <TableRow key={sum.siteId}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">
                        {sum.siteId}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {matchCode ? matchCode.displayName : "Distribuidor Registrado"}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-emerald-700">
                        {sum.qualifiedReferrals}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-950">
                        <Badge variant="success" className="font-mono text-xs">
                          {sum.earnedMonths} {sum.earnedMonths === 1 ? "mes" : "meses"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </div>
      )}
    </div>
  );
}
