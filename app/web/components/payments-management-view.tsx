"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import {
  CreditCard,
  DollarSign,
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Ban,
  Clock,
  ChevronDown,
  X,
  UserCheck,
  Zap,
  Tag,
  Layers
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label, Input } from "@/components/ui/form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ModalPortal } from "@/components/ui/modal-portal";
import { ModuleRecord } from "@/modules/catalog";

import {
  CATALOG_OFFERS,
  ECOSYSTEM_LABELS,
  type ManualPaymentEcosystem,
  type ManualPaymentPricingMode,
  type ManualPaymentCommercialSnapshot
} from "@/components/manualPaymentConstants";

type PaymentCategory = "ACTIVATION" | "MONTHLY_FEE" | "ANNUAL_RENEWAL" | "ADD_ON" | "OTHER";
type PaymentMethod = "WOMPI" | "BANCOLOMBIA" | "NEQUI" | "NU" | "CASH" | "OTHER";
type PaymentStatus = "CONFIRMED" | "VOIDED";

export type { ManualPaymentEcosystem, ManualPaymentPricingMode, ManualPaymentCommercialSnapshot };

export interface PaymentRecord {
  id: string;
  activationLeadId: string;
  siteId: string | null;
  category: PaymentCategory;
  amountCop: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  voidedAt?: string | null;
  voidReason?: string | null;
  commercialSnapshot?: ManualPaymentCommercialSnapshot;
  regenerationRequired?: boolean;
}

interface PaymentsResponse {
  payments: PaymentRecord[];
  totalAmountCop: number;
  totalsByLocalDate: Record<string, number>;
}

type PaymentsManagementViewProps = {
  record?: ModuleRecord;
};

export interface ActivationLeadOption {
  id: string;
  fullName: string;
  brandName: string;
  siteId: string | null;
  domain: string | null;
}

export function PaymentsManagementView({ record }: PaymentsManagementViewProps) {
  const [paymentsData, setPaymentsData] = useState<PaymentsResponse>({
    payments: [],
    totalAmountCop: 0,
    totalsByLocalDate: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | PaymentCategory>("ALL");
  const [searchLeadId, setSearchLeadId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals & Feedback Alerts
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [regenerationAlert, setRegenerationAlert] = useState<string | null>(null);

  // Commercial Pricing Mode & Ecosystem State
  const [pricingMode, setPricingMode] = useState<ManualPaymentPricingMode>("CATALOG");
  const [selectedOfferKey, setSelectedOfferKey] = useState<keyof typeof CATALOG_OFFERS>("PLAN_360");
  const [selectedEcosystems, setSelectedEcosystems] = useState<ManualPaymentEcosystem[]>([
    "PRODUCT",
    "BUSINESS",
    "PERSONAL_BRAND"
  ]);
  const [negotiatedAmountInput, setNegotiatedAmountInput] = useState("");

  // Register Form
  const [registerForm, setRegisterForm] = useState({
    activationLeadId: "",
    category: "ACTIVATION" as PaymentCategory,
    amountCop: "350000",
    method: "BANCOLOMBIA" as PaymentMethod,
    paidAt: new Date().toISOString().slice(0, 16),
    reference: "",
    notes: ""
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Void Form
  const [voidForm, setVoidForm] = useState({
    paymentId: "",
    reason: ""
  });
  const [isVoiding, setIsVoiding] = useState(false);

  // Activation Leads for Searchable Partner Selector
  const [leads, setLeads] = useState<ActivationLeadOption[]>([]);
  const [isLeadsLoading, setIsLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const fetchLeads = async () => {
    setIsLeadsLoading(true);
    setLeadsError(null);
    try {
      const res = await fetch("/api/internal/activation-leads");
      if (!res.ok) throw new Error("No se pudo obtener la lista de partners");
      const data = await res.json();
      const rawLeads = data.leads || [];
      const mapped: ActivationLeadOption[] = rawLeads.map((lead: {
        id: string;
        fullName?: string;
        brandName?: string;
        siteId?: string | null;
        onboardingData?: { domain?: string; customDomain?: string; domainName?: string };
      }) => ({
        id: lead.id,
        fullName: lead.fullName || "Sin nombre",
        brandName: lead.brandName || "",
        siteId: lead.siteId || null,
        domain: lead.onboardingData?.domain || lead.onboardingData?.customDomain || lead.onboardingData?.domainName || null
      }));
      setLeads(mapped);
    } catch (err: unknown) {
      setLeadsError(err instanceof Error ? err.message : "Error al cargar partners");
    } finally {
      setIsLeadsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const leadsMap = useMemo(() => {
    const map: Record<string, ActivationLeadOption> = {};
    leads.forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [leads]);

  const openRegisterModal = () => {
    setIsRegisterModalOpen(true);
    setIsSelectorOpen(false);
    setLeadSearchQuery("");
    setRegenerationAlert(null);
    if (leads.length === 0 && !isLeadsLoading) {
      fetchLeads();
    }
  };

  const filteredLeadsForSelector = leads.filter((lead) => {
    const q = leadSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      lead.fullName.toLowerCase().includes(q) ||
      lead.brandName.toLowerCase().includes(q) ||
      (lead.siteId && lead.siteId.toLowerCase().includes(q)) ||
      (lead.domain && lead.domain.toLowerCase().includes(q)) ||
      lead.id.toLowerCase().includes(q)
    );
  });

  const selectedLeadObj = leads.find((l) => l.id === registerForm.activationLeadId);

  // Check if selected lead has legacy unassigned manual payments
  const selectedLeadHasLegacyUnassigned = useMemo(() => {
    if (!registerForm.activationLeadId) return false;
    return paymentsData.payments.some(
      (p) =>
        p.activationLeadId === registerForm.activationLeadId &&
        p.method !== "WOMPI" &&
        !p.commercialSnapshot &&
        p.status === "CONFIRMED"
    );
  }, [registerForm.activationLeadId, paymentsData.payments]);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, dateFrom, dateTo]);

  const fetchPayments = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);
      if (searchLeadId.trim()) params.append("activationLeadId", searchLeadId.trim());

      const res = await fetch(`/api/internal/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Fallo al obtener los pagos");
      const data = await res.json();
      setPaymentsData(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de red");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleOfferChange = (offerKey: keyof typeof CATALOG_OFFERS) => {
    setSelectedOfferKey(offerKey);
    const offer = CATALOG_OFFERS[offerKey];
    setSelectedEcosystems([...offer.ecosystems]);
    setRegisterForm((prev) => ({
      ...prev,
      amountCop: offer.amountCop.toString()
    }));
  };

  const toggleNegotiatedEcosystem = (ecosystem: ManualPaymentEcosystem) => {
    setSelectedEcosystems((prev) =>
      prev.includes(ecosystem)
        ? prev.filter((e) => e !== ecosystem)
        : [...prev, ecosystem]
    );
  };

  const handleRegisterPayment = async (e: FormEvent) => {
    e.preventDefault();
    setRegenerationAlert(null);

    if (!registerForm.activationLeadId.trim()) {
      alert("Debes seleccionar un Partner antes de registrar el pago.");
      return;
    }

    let finalAmount = 0;
    let payload: Record<string, unknown> = {
      activationLeadId: registerForm.activationLeadId.trim(),
      category: registerForm.category,
      method: registerForm.method,
      paidAt: new Date(registerForm.paidAt).toISOString(),
      reference: registerForm.reference.trim() || undefined,
      notes: registerForm.notes.trim() || undefined
    };

    if (pricingMode === "CATALOG") {
      const offer = CATALOG_OFFERS[selectedOfferKey];
      if (!offer) {
        alert("Por favor selecciona una oferta de catálogo válida.");
        return;
      }
      finalAmount = offer.amountCop;
      payload = {
        ...payload,
        amountCop: finalAmount,
        pricingMode: "CATALOG",
        offerCode: offer.offerCode,
        ecosystemTypes: [...offer.ecosystems]
      };
    } else {
      // MANUAL_NEGOTIATED mode
      finalAmount = parseInt(negotiatedAmountInput, 10);
      if (isNaN(finalAmount) || finalAmount <= 0) {
        alert("El monto negociado debe ser un número entero positivo.");
        return;
      }
      if (selectedEcosystems.length === 0) {
        alert("Debes seleccionar al menos un ecosistema para el pago negociado.");
        return;
      }
      const uniqueEcosystems = Array.from(new Set(selectedEcosystems));
      payload = {
        ...payload,
        amountCop: finalAmount,
        pricingMode: "MANUAL_NEGOTIATED",
        ecosystemTypes: uniqueEcosystems
      };
    }

    if (!confirm(`¿Estás seguro de registrar este pago por ${formatCurrency(finalAmount)}?`)) return;

    setIsRegistering(true);
    try {
      const res = await fetch("/api/internal/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "No se pudo registrar el pago");
      }

      if (resData.regenerationRequired) {
        setRegenerationAlert(
          "¡Pago registrado exitosamente! La API reporta que se requiere regenerar el sitio/landing del partner (regenerationRequired: true)."
        );
      }

      setIsRegisterModalOpen(false);
      setIsSelectorOpen(false);
      setRegisterForm({
        ...registerForm,
        activationLeadId: "",
        amountCop: "350000",
        reference: "",
        notes: ""
      });
      setNegotiatedAmountInput("");
      fetchPayments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsRegistering(false);
    }
  };

  const openVoidModal = (paymentId: string) => {
    setVoidForm({ paymentId, reason: "" });
    setIsVoidModalOpen(true);
  };

  const handleVoidPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!voidForm.reason.trim()) {
      alert("El motivo de anulación es obligatorio.");
      return;
    }

    if (!confirm("Esta acción es irreversible. ¿Confirmas anular este pago?")) return;

    setIsVoiding(true);
    try {
      const res = await fetch(`/api/internal/payments/${voidForm.paymentId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidForm.reason.trim() })
      });
      if (!res.ok) throw new Error("No se pudo anular el pago");

      setIsVoidModalOpen(false);
      fetchPayments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsVoiding(false);
    }
  };

  const filteredPayments = paymentsData.payments.filter((p) => {
    if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
    if (searchLeadId && !p.activationLeadId.includes(searchLeadId)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-blue-600" />
          {record?.name || "Payments"}
        </h1>
        <p className="text-slate-500 mt-2">
          {record?.description || "Registro y trazabilidad financiera."}
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ingresos Confirmados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(paymentsData.totalAmountCop)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Total de pagos con estado CONFIRMED
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {paymentsData.payments.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cantidad de movimientos en el periodo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Regeneration State Feedback Alert Banner */}
      {regenerationAlert && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Zap className="h-5 w-5 text-blue-600 shrink-0" />
            <span>{regenerationAlert}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRegenerationAlert(null)}
            className="text-blue-700 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border-b border-slate-100">
          <div>
            <CardTitle>Historial de Pagos</CardTitle>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={openRegisterModal}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Registrar Pago Manual
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Status filter */}
              <div className="flex items-center gap-1 border border-slate-200 rounded-md p-1 bg-slate-50">
                <Button
                  variant={statusFilter === "ALL" ? "primary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setStatusFilter("ALL")}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === "CONFIRMED" ? "primary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setStatusFilter("CONFIRMED")}
                >
                  Confirmados
                </Button>
                <Button
                  variant={statusFilter === "VOIDED" ? "primary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setStatusFilter("VOIDED")}
                >
                  Anulados
                </Button>
              </div>

              {/* Category filter */}
              <select
                className="h-9 text-xs rounded-md border border-slate-200 bg-white px-2 py-1 outline-none"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as "ALL" | PaymentCategory)}
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="ACTIVATION">ACTIVATION</option>
                <option value="MONTHLY_FEE">MONTHLY_FEE</option>
                <option value="ANNUAL_RENEWAL">ANNUAL_RENEWAL</option>
                <option value="ADD_ON">ADD_ON</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            {/* Lead Search & Date Range */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filtrar por Lead ID..."
                  value={searchLeadId}
                  onChange={(e) => setSearchLeadId(e.target.value)}
                  className="pl-8 text-xs h-9 w-40 md:w-48"
                />
              </div>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-auto"
                title="Desde"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-auto"
                title="Hasta"
              />
              <Button variant="outline" size="sm" className="px-2 h-10" onClick={fetchPayments} title="Actualizar">
                <RefreshCw className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Partner / Site</TableHead>
                  <TableHead>Categoría / Método</TableHead>
                  <TableHead>Asignación Ecosistemas</TableHead>
                  <TableHead className="text-right">Monto (COP)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Detalles</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                      Cargando pagos...
                    </TableCell>
                  </TableRow>
                ) : errorMsg ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                      <p className="text-rose-600 font-medium">{errorMsg}</p>
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      <DollarSign className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      No hay pagos registrados para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => {
                    const snap = payment.commercialSnapshot;
                    const isLegacyUnassigned = payment.method !== "WOMPI" && !snap && payment.status === "CONFIRMED";

                    return (
                      <TableRow key={payment.id} className={payment.status === "VOIDED" ? "bg-slate-50 opacity-70" : ""}>
                        <TableCell>
                          <div className="font-medium text-slate-900">
                            {new Date(payment.paidAt).toLocaleDateString("es-CO")}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(payment.paidAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium text-slate-900">
                            {leadsMap[payment.activationLeadId]?.fullName || payment.activationLeadId}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            ID: {payment.activationLeadId}
                          </div>
                          {payment.siteId && (
                            <div className="text-xs text-slate-500 font-mono">
                              Site: {payment.siteId}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium text-slate-700">
                            {payment.category}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 font-medium">
                            {payment.method}
                          </div>
                        </TableCell>

                        {/* Ecosystem & Pricing Snapshot Column */}
                        <TableCell>
                          <div className="space-y-1">
                            {snap ? (
                              <>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-700 border-slate-200">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {snap.pricingMode === "CATALOG" ? `Catálogo (${snap.offerCode || "Oferta"})` : "Negociado Manual"}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {snap.ecosystemTypes.map((eco) => {
                                    const meta = ECOSYSTEM_LABELS[eco];
                                    return (
                                      <span
                                        key={eco}
                                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${meta.color}`}
                                      >
                                        {meta.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              </>
                            ) : isLegacyUnassigned ? (
                              <Badge variant="warning" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                                <AlertTriangle className="h-3 w-3 mr-1 text-amber-600" />
                                Requiere Asignación (Legacy)
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Sin snapshot</span>
                            )}

                            {payment.regenerationRequired && (
                              <div>
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                  <Zap className="h-3 w-3 mr-1 text-blue-600" />
                                  Regeneración Pendiente
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-medium text-slate-900">
                          {payment.status === "VOIDED" ? (
                            <span className="line-through text-slate-400">{formatCurrency(payment.amountCop)}</span>
                          ) : (
                            formatCurrency(payment.amountCop)
                          )}
                        </TableCell>

                        <TableCell>
                          {payment.status === "CONFIRMED" ? (
                            <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              CONFIRMED
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="bg-slate-100 text-slate-600 border-slate-300">
                              <XCircle className="h-3 w-3 mr-1" />
                              VOIDED
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-xs max-w-[180px] truncate text-slate-600" title={payment.reference || ""}>
                            Ref: {payment.reference || "N/A"}
                          </div>
                          {payment.notes && (
                            <div className="text-[11px] text-slate-500 max-w-[180px] truncate" title={payment.notes}>
                              Nota: {payment.notes}
                            </div>
                          )}
                          {payment.status === "VOIDED" && payment.voidReason && (
                            <div className="text-xs text-rose-600 max-w-[180px] truncate mt-0.5" title={payment.voidReason}>
                              Anulado: {payment.voidReason}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {payment.status === "CONFIRMED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => openVoidModal(payment.id)}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Anular
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Manual Payment Modal */}
      {isRegisterModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
              <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  Registrar Pago Manual con Ecosistemas
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-4 overflow-y-auto flex-1 space-y-4">
                <form id="manual-payment-form" onSubmit={handleRegisterPayment} className="space-y-4">
                  {/* Searchable Partner Selector */}
                  <div className="space-y-1.5 relative">
                    <Label>Partner (Activation Lead) *</Label>
                    {selectedLeadObj ? (
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm">
                        <div className="truncate">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
                            <span>{selectedLeadObj.fullName}</span>
                            {selectedLeadObj.brandName && (
                              <span className="text-slate-500 font-normal">({selectedLeadObj.brandName})</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">ID: {selectedLeadObj.id}</span>
                            {selectedLeadObj.siteId && (
                              <span className="font-mono text-[11px]">Site: {selectedLeadObj.siteId}</span>
                            )}
                            {selectedLeadObj.domain && (
                              <span className="text-blue-600 font-medium">🌐 {selectedLeadObj.domain}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600 ml-2 shrink-0"
                          onClick={() => setRegisterForm({ ...registerForm, activationLeadId: "" })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-950"
                          onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                        >
                          <span className="text-slate-400">Seleccionar Partner...</span>
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>

                        {isSelectorOpen && (
                          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-2 space-y-2 max-h-64 flex flex-col">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <Input
                                autoFocus
                                placeholder="Buscar por nombre, site, dominio o ID..."
                                value={leadSearchQuery}
                                onChange={(e) => setLeadSearchQuery(e.target.value)}
                                className="pl-8 text-xs h-8"
                              />
                            </div>

                            <div className="overflow-y-auto flex-1 space-y-1 min-h-[80px]">
                              {isLeadsLoading ? (
                                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                                  Cargando partners...
                                </div>
                              ) : leadsError ? (
                                <div className="p-3 text-center text-xs text-rose-600 space-y-1">
                                  <p className="flex items-center justify-center gap-1">
                                    <AlertTriangle className="h-4 w-4" /> {leadsError}
                                  </p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={fetchLeads}
                                    className="text-xs h-7 text-blue-600 hover:underline"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" /> Reintentar
                                  </Button>
                                </div>
                              ) : leads.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-500">
                                  No hay partners registrados.
                                </div>
                              ) : filteredLeadsForSelector.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-500">
                                  No se encontraron partners para &quot;{leadSearchQuery}&quot;.
                                </div>
                              ) : (
                                filteredLeadsForSelector.map((lead) => (
                                  <button
                                    key={lead.id}
                                    type="button"
                                    className="w-full text-left p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 flex flex-col gap-0.5"
                                    onClick={() => {
                                      setRegisterForm({ ...registerForm, activationLeadId: lead.id });
                                      setIsSelectorOpen(false);
                                      setLeadSearchQuery("");
                                    }}
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-semibold text-slate-900">{lead.fullName}</span>
                                      {lead.brandName && (
                                        <span className="text-slate-500 font-normal truncate max-w-[120px]">{lead.brandName}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                      <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">ID: {lead.id}</span>
                                      {lead.siteId && <span className="font-mono">Site: {lead.siteId}</span>}
                                      {lead.domain && <span className="text-blue-600">🌐 {lead.domain}</span>}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Legacy Payment Warning Banner */}
                  {selectedLeadHasLegacyUnassigned && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Advertencia de Asignación Comercial:</span>
                        <p className="mt-0.5 text-amber-800">
                          Este partner tiene pagos manuales anteriores registrados sin asignación explícita de ecosistemas. Este nuevo registro actualizará su asignación en el servidor.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Commercial Pricing Mode Selector */}
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-blue-600" />
                      Modo de Cotización / Asignación Comercial *
                    </Label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPricingMode("CATALOG");
                          handleOfferChange(selectedOfferKey);
                        }}
                        className={`py-2 px-2 rounded-md text-xs font-semibold border transition-all text-center ${
                          pricingMode === "CATALOG"
                            ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Catálogo de Oferta
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPricingMode("MANUAL_NEGOTIATED");
                          if (selectedEcosystems.length === 0) {
                            setSelectedEcosystems(["PRODUCT"]);
                          }
                        }}
                        className={`py-2 px-2 rounded-md text-xs font-semibold border transition-all text-center ${
                          pricingMode === "MANUAL_NEGOTIATED"
                            ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Negociado Manual
                      </button>
                    </div>

                    {/* CATALOG MODE SELECTOR */}
                    {pricingMode === "CATALOG" && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                        <Label className="text-xs text-slate-700 font-semibold">Oferta / Plan de Catálogo *</Label>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={selectedOfferKey}
                          onChange={(e) => handleOfferChange(e.target.value as keyof typeof CATALOG_OFFERS)}
                        >
                          {Object.entries(CATALOG_OFFERS).map(([key, offer]) => (
                            <option key={key} value={key}>
                              {offer.name} — {formatCurrency(offer.amountCop)}
                            </option>
                          ))}
                        </select>

                        <div className="rounded-md border border-blue-100 bg-blue-50/70 p-2.5 text-xs text-blue-900 space-y-1">
                          <p className="font-semibold">{CATALOG_OFFERS[selectedOfferKey].description}</p>
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            <span className="text-[10px] text-blue-700 font-medium mr-1">Ecosistemas incluidos:</span>
                            {CATALOG_OFFERS[selectedOfferKey].ecosystems.map((eco) => (
                              <span
                                key={eco}
                                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${ECOSYSTEM_LABELS[eco].color}`}
                              >
                                {ECOSYSTEM_LABELS[eco].name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MANUAL_NEGOTIATED MODE SELECTOR */}
                    {pricingMode === "MANUAL_NEGOTIATED" && (
                      <div className="mt-3 space-y-3 pt-2 border-t border-amber-200/60">
                        <div>
                          <Label className="text-xs text-amber-900 font-semibold">Ecosistemas a Incluir *</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
                            {(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] as ManualPaymentEcosystem[]).map((eco) => {
                              const isChecked = selectedEcosystems.includes(eco);
                              const meta = ECOSYSTEM_LABELS[eco];
                              return (
                                <label
                                  key={eco}
                                  className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                    isChecked
                                      ? "border-amber-400 bg-amber-50 font-bold text-amber-950"
                                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleNegotiatedEcosystem(eco)}
                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                  />
                                  <span>{meta.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-amber-900 font-semibold">Monto Negociado (COP) *</Label>
                          <Input
                            required
                            type="number"
                            min="1"
                            step="1"
                            value={negotiatedAmountInput}
                            onChange={(e) => setNegotiatedAmountInput(e.target.value)}
                            placeholder="Ej: 250000"
                            className="h-9 text-xs"
                          />
                          <p className="text-[11px] text-amber-700">
                            Ingresa el precio directo negociado para esta combinación de ecosistemas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Categoría *</Label>
                      <select
                        required
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-950"
                        value={registerForm.category}
                        onChange={(e) => setRegisterForm({ ...registerForm, category: e.target.value as PaymentCategory })}
                      >
                        <option value="ACTIVATION">ACTIVATION</option>
                        <option value="MONTHLY_FEE">MONTHLY_FEE</option>
                        <option value="ANNUAL_RENEWAL">ANNUAL_RENEWAL</option>
                        <option value="ADD_ON">ADD_ON</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label>Método *</Label>
                      <select
                        required
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-950"
                        value={registerForm.method}
                        onChange={(e) => setRegisterForm({ ...registerForm, method: e.target.value as PaymentMethod })}
                      >
                        <option value="BANCOLOMBIA">BANCOLOMBIA</option>
                        <option value="NEQUI">NEQUI</option>
                        <option value="NU">NU</option>
                        <option value="CASH">CASH</option>
                        <option value="WOMPI">WOMPI</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Fecha y Hora del Pago *</Label>
                    <Input
                      required
                      type="datetime-local"
                      value={registerForm.paidAt}
                      onChange={(e) => setRegisterForm({ ...registerForm, paidAt: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Referencia (Opcional)</Label>
                    <Input
                      value={registerForm.reference}
                      onChange={(e) => setRegisterForm({ ...registerForm, reference: e.target.value })}
                      placeholder="Ref del banco o transacción"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Notas Internas / Justificación Negociada (Opcional)</Label>
                    <Input
                      value={registerForm.notes}
                      onChange={(e) => setRegisterForm({ ...registerForm, notes: e.target.value })}
                      placeholder="Ej: Descuento autorizado por volumen de referidos..."
                    />
                  </div>
                </form>
              </CardContent>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRegisterModalOpen(false)}
                  disabled={isRegistering}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form="manual-payment-form"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isRegistering || !registerForm.activationLeadId.trim()}
                >
                  {isRegistering ? "Registrando..." : "Registrar Pago"}
                </Button>
              </div>
            </Card>
          </div>
        </ModalPortal>
      )}

      {/* Void Modal */}
      {isVoidModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <Card className="w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 border-rose-100">
              <CardHeader className="pb-4 border-b border-rose-100 bg-rose-50/50">
                <CardTitle className="text-lg text-rose-800 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Anular Pago Confirmado
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-slate-600 mb-4">
                  Los ingresos se descontarán de las métricas. Esta acción no se puede deshacer y quedará registrada en el historial financiero del Partner.
                </p>
                <form onSubmit={handleVoidPayment} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Motivo de la anulación *</Label>
                    <Input
                      required
                      autoFocus
                      placeholder="Ej: Registro duplicado, cliente solicitó reembolso..."
                      value={voidForm.reason}
                      onChange={(e) => setVoidForm({ ...voidForm, reason: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsVoidModalOpen(false)}
                      disabled={isVoiding}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="danger"
                      disabled={isVoiding}
                    >
                      {isVoiding ? "Anulando..." : "Confirmar Anulación"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
