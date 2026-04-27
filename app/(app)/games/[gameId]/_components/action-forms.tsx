"use client";

import { useState, useTransition } from "react";
import { Field, TextInput, Select, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { addDecisionAction, declarePlayerEndingAction } from "../../actions";
import type { Action, GameState } from "@/lib/game/types";
import { NlEscapeForm } from "./nl-escape-form";

type Category = "finance" | "team" | "product" | "market" | "strategy" | "nl" | "endgame";

export function ActionForms({
  gameId,
  state,
  category,
}: {
  gameId: string;
  state: GameState;
  category: Category;
}) {
  const [isPending, startTransition] = useTransition();
  const submit = (action: Action) =>
    startTransition(() => addDecisionAction({ gameId, action }));
  const submitEnding = (action: Action) =>
    startTransition(() => declarePlayerEndingAction({ gameId, action }));

  if (category === "finance") return <FinanceForms submit={submit} pending={isPending} />;
  if (category === "team")    return <TeamForms submit={submit} pending={isPending} />;
  if (category === "product") return <ProductForms submit={submit} pending={isPending} state={state} />;
  if (category === "market")  return <MarketForms submit={submit} pending={isPending} />;
  if (category === "strategy")return <StrategyForms submit={submit} pending={isPending} state={state} />;
  if (category === "nl")      return <NlEscapeForm gameId={gameId} />;
  return <EndgameForms submit={submitEnding} pending={isPending} />;
}

type SubmitProps = { submit: (a: Action) => void; pending: boolean };

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-3 mb-2.5">{children}</div>;
}

function FinanceForms({ submit, pending }: SubmitProps) {
  const [round, setRound] = useState<"seed" | "A" | "B" | "C">("seed");
  const [amount, setAmount] = useState("500000");
  const [equityPct, setEquityPct] = useState("15");
  const [investorName, setInvestorName] = useState("Northstar Capital");
  const [boardSeats, setBoardSeats] = useState("1");
  const [hasVeto, setHasVeto] = useState(false);
  const [allocCategory, setAllocCategory] = useState<"marketing" | "rd" | "ops">("marketing");
  const [allocAmount, setAllocAmount] = useState("10000");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Lever des fonds</h3>
        <Row>
          <Field label="Round"><Select value={round} onChange={(v) => setRound(v as "seed" | "A" | "B" | "C")} options={["seed", "A", "B", "C"] as const} /></Field>
          <Field label="Montant ($)"><TextInput value={amount} onChange={setAmount} /></Field>
          <Field label="Équité (%)"><TextInput value={equityPct} onChange={setEquityPct} /></Field>
        </Row>
        <Row>
          <Field label="Investisseur"><TextInput value={investorName} onChange={setInvestorName} /></Field>
          <Field label="Sièges board"><TextInput value={boardSeats} onChange={setBoardSeats} /></Field>
          <Field label="Veto"><Checkbox label="Droit de veto" checked={hasVeto} onChange={setHasVeto} /></Field>
        </Row>
        <Button
          variant="primary" size="sm" disabled={pending}
          onClick={() => submit({ kind: "finance.raiseFunds", round, amount: Number(amount), equityPct: Number(equityPct), investorName, boardSeats: Number(boardSeats), hasVeto })}
        >
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Allouer un budget</h3>
        <Row>
          <Field label="Catégorie"><Select value={allocCategory} onChange={(v) => setAllocCategory(v as "marketing" | "rd" | "ops")} options={["marketing", "rd", "ops"] as const} /></Field>
          <Field label="Montant ($)"><TextInput value={allocAmount} onChange={setAllocAmount} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "finance.allocateBudget", category: allocCategory, amount: Number(allocAmount) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function TeamForms({ submit, pending }: SubmitProps) {
  const [level, setLevel] = useState<"junior" | "senior" | "exec">("senior");
  const [salary, setSalary] = useState("120000");
  const [fireCount, setFireCount] = useState("1");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Embaucher</h3>
        <Row>
          <Field label="Niveau"><Select value={level} onChange={(v) => setLevel(v as "junior" | "senior" | "exec")} options={["junior", "senior", "exec"] as const} /></Field>
          <Field label="Salaire annuel ($)"><TextInput value={salary} onChange={setSalary} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "team.hire", level, salaryAnnual: Number(salary) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Licencier</h3>
        <Row>
          <Field label="Nombre"><TextInput value={fireCount} onChange={setFireCount} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "team.fire", count: Number(fireCount) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function ProductForms({ submit, pending, state }: SubmitProps & { state: GameState }) {
  const [name, setName] = useState("Nouveau produit");
  const [quarters, setQuarters] = useState("3");
  const [launchName, setLaunchName] = useState(state.playerState.products[0]?.name ?? "");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Démarrer R&amp;D</h3>
        <Row>
          <Field label="Nom"><TextInput value={name} onChange={setName} /></Field>
          <Field label="Trimestres"><TextInput value={quarters} onChange={setQuarters} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "product.startRD", productName: name, quartersUntilLaunch: Number(quarters) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Lancer un produit existant</h3>
        <Row>
          <Field label="Nom du produit"><TextInput value={launchName} onChange={setLaunchName} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "product.launch", productName: launchName })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function MarketForms({ submit, pending }: SubmitProps) {
  const [budget, setBudget] = useState("20000");
  const [pricingDelta, setPricingDelta] = useState("10");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Campagne marketing</h3>
        <Row>
          <Field label="Budget ($)"><TextInput value={budget} onChange={setBudget} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "market.campaign", budget: Number(budget) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Ajuster le pricing</h3>
        <Row>
          <Field label="Delta (%)"><TextInput value={pricingDelta} onChange={setPricingDelta} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "market.adjustPricing", deltaPct: Number(pricingDelta) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function StrategyForms({ submit, pending, state }: SubmitProps & { state: GameState }) {
  const [partner, setPartner] = useState("BigCo");
  const [revShare, setRevShare] = useState("10");
  const [competitorId, setCompetitorId] = useState(state.worldState.competitors[0]?.id ?? "");
  const [offer, setOffer] = useState("10000000");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Partenariat</h3>
        <Row>
          <Field label="Partenaire"><TextInput value={partner} onChange={setPartner} /></Field>
          <Field label="Rev share (%)"><TextInput value={revShare} onChange={setRevShare} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "strategy.partnership", partnerName: partner, revShare: Number(revShare) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Tenter une acquisition</h3>
        <Row>
          <Field label="Concurrent (id)"><TextInput value={competitorId} onChange={setCompetitorId} /></Field>
          <Field label="Offre ($)"><TextInput value={offer} onChange={setOffer} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "strategy.tryAcquire", competitorId, offerAmount: Number(offer) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function EndgameForms({ submit, pending }: SubmitProps) {
  const confirmEnd = (label: string, action: Action) => {
    if (typeof window !== "undefined" && !window.confirm(`Déclarer "${label}" termine la partie immédiatement. Continuer ?`)) return;
    submit(action);
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted">Déclarer une sortie termine la partie immédiatement.</p>
      <Button variant="success" size="md" disabled={pending} onClick={() => confirmEnd("IPO", { kind: "endgame.declareIPO" })}>🎉 IPO</Button>
      <Button variant="success" size="md" disabled={pending} onClick={() => confirmEnd("Acquisition", { kind: "endgame.acceptAcquisition", acquirerName: "BigCorp", price: 50_000_000 })}>🤝 Acquisition (BigCorp / $50M)</Button>
      <Button variant="secondary" size="md" disabled={pending} onClick={() => confirmEnd("Lifestyle business", { kind: "endgame.declareLifestyle" })}>🏡 Lifestyle business</Button>
      <Button variant="secondary" size="md" disabled={pending} onClick={() => confirmEnd("Conglomérat", { kind: "endgame.declareConglomerate" })}>👑 Conglomérat</Button>
    </div>
  );
}
