"use client";

import { useState, useTransition } from "react";
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
  if (category === "team") return <TeamForms submit={submit} pending={isPending} />;
  if (category === "product") return <ProductForms submit={submit} pending={isPending} state={state} />;
  if (category === "market") return <MarketForms submit={submit} pending={isPending} />;
  if (category === "strategy")
    return <StrategyForms submit={submit} pending={isPending} state={state} />;
  if (category === "nl") return <NlEscapeForm gameId={gameId} />;
  return <EndgameForms submit={submitEnding} pending={isPending} />;
}

type SubmitProps = { submit: (a: Action) => void; pending: boolean };

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
    <div className="space-y-4">
      <Box title="Lever des fonds">
        <Row>
          <Select label="Round" value={round} onChange={(v) => setRound(v as "seed" | "A" | "B" | "C")} options={["seed", "A", "B", "C"]} />
          <NumInput label="Montant ($)" value={amount} onChange={setAmount} />
          <NumInput label="Équité (%)" value={equityPct} onChange={setEquityPct} />
        </Row>
        <Row>
          <TextInput label="Investisseur" value={investorName} onChange={setInvestorName} />
          <NumInput label="Sièges board" value={boardSeats} onChange={setBoardSeats} />
          <Check label="Veto" checked={hasVeto} onChange={setHasVeto} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() =>
            submit({
              kind: "finance.raiseFunds",
              round,
              amount: Number(amount),
              equityPct: Number(equityPct),
              investorName,
              boardSeats: Number(boardSeats),
              hasVeto,
            })
          }
        />
      </Box>
      <Box title="Allouer un budget">
        <Row>
          <Select label="Catégorie" value={allocCategory} onChange={(v) => setAllocCategory(v as "marketing" | "rd" | "ops")} options={["marketing", "rd", "ops"]} />
          <NumInput label="Montant ($)" value={allocAmount} onChange={setAllocAmount} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() =>
            submit({ kind: "finance.allocateBudget", category: allocCategory, amount: Number(allocAmount) })
          }
        />
      </Box>
    </div>
  );
}

function TeamForms({ submit, pending }: SubmitProps) {
  const [level, setLevel] = useState<"junior" | "senior" | "exec">("senior");
  const [salary, setSalary] = useState("120000");
  const [fireCount, setFireCount] = useState("1");
  return (
    <div className="space-y-4">
      <Box title="Embaucher">
        <Row>
          <Select label="Niveau" value={level} onChange={(v) => setLevel(v as "junior" | "senior" | "exec")} options={["junior", "senior", "exec"]} />
          <NumInput label="Salaire annuel ($)" value={salary} onChange={setSalary} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() => submit({ kind: "team.hire", level, salaryAnnual: Number(salary) })}
        />
      </Box>
      <Box title="Licencier">
        <Row>
          <NumInput label="Nombre" value={fireCount} onChange={setFireCount} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() => submit({ kind: "team.fire", count: Number(fireCount) })}
        />
      </Box>
    </div>
  );
}

function ProductForms({ submit, pending, state }: SubmitProps & { state: GameState }) {
  const [name, setName] = useState("Nouveau produit");
  const [quarters, setQuarters] = useState("3");
  const [launchName, setLaunchName] = useState(
    state.playerState.products[0]?.name ?? "",
  );
  return (
    <div className="space-y-4">
      <Box title="Démarrer R&D">
        <Row>
          <TextInput label="Nom" value={name} onChange={setName} />
          <NumInput label="Trimestres" value={quarters} onChange={setQuarters} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() =>
            submit({
              kind: "product.startRD",
              productName: name,
              quartersUntilLaunch: Number(quarters),
            })
          }
        />
      </Box>
      <Box title="Lancer un produit existant">
        <Row>
          <TextInput label="Nom du produit" value={launchName} onChange={setLaunchName} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() => submit({ kind: "product.launch", productName: launchName })}
        />
      </Box>
    </div>
  );
}

function MarketForms({ submit, pending }: SubmitProps) {
  const [budget, setBudget] = useState("20000");
  const [pricingDelta, setPricingDelta] = useState("10");
  return (
    <div className="space-y-4">
      <Box title="Campagne marketing">
        <Row>
          <NumInput label="Budget ($)" value={budget} onChange={setBudget} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() => submit({ kind: "market.campaign", budget: Number(budget) })}
        />
      </Box>
      <Box title="Ajuster le pricing">
        <Row>
          <NumInput label="Delta (%)" value={pricingDelta} onChange={setPricingDelta} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() =>
            submit({ kind: "market.adjustPricing", deltaPct: Number(pricingDelta) })
          }
        />
      </Box>
    </div>
  );
}

function StrategyForms({ submit, pending, state }: SubmitProps & { state: GameState }) {
  const [partner, setPartner] = useState("BigCo");
  const [revShare, setRevShare] = useState("10");
  const [competitorId, setCompetitorId] = useState(
    state.worldState.competitors[0]?.id ?? "",
  );
  const [offer, setOffer] = useState("10000000");
  return (
    <div className="space-y-4">
      <Box title="Partenariat">
        <Row>
          <TextInput label="Partenaire" value={partner} onChange={setPartner} />
          <NumInput label="Rev share (%)" value={revShare} onChange={setRevShare} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() =>
            submit({ kind: "strategy.partnership", partnerName: partner, revShare: Number(revShare) })
          }
        />
      </Box>
      <Box title="Tenter une acquisition">
        <Row>
          <TextInput label="Concurrent (id)" value={competitorId} onChange={setCompetitorId} />
          <NumInput label="Offre ($)" value={offer} onChange={setOffer} />
        </Row>
        <SubmitBtn
          pending={pending}
          onClick={() =>
            submit({ kind: "strategy.tryAcquire", competitorId, offerAmount: Number(offer) })
          }
        />
      </Box>
    </div>
  );
}

function EndgameForms({ submit, pending }: SubmitProps) {
  const confirmEnd = (label: string, action: Action) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Déclarer "${label}" termine la partie immédiatement. Continuer ?`)
    ) {
      return;
    }
    submit(action);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-400">
        Déclarer une sortie termine la partie immédiatement.
      </p>
      <SubmitBtn
        pending={pending}
        label="🎉 IPO"
        onClick={() => confirmEnd("IPO", { kind: "endgame.declareIPO" })}
      />
      <SubmitBtn
        pending={pending}
        label="🤝 Acquisition (BigCorp / $50M)"
        onClick={() =>
          confirmEnd("Acquisition", {
            kind: "endgame.acceptAcquisition",
            acquirerName: "BigCorp",
            price: 50_000_000,
          })
        }
      />
      <SubmitBtn
        pending={pending}
        label="🏡 Lifestyle business"
        onClick={() => confirmEnd("Lifestyle business", { kind: "endgame.declareLifestyle" })}
      />
      <SubmitBtn
        pending={pending}
        label="👑 Conglomérat"
        onClick={() => confirmEnd("Conglomérat", { kind: "endgame.declareConglomerate" })}
      />
    </div>
  );
}

// ─── Tiny atoms ─────────────────────────────────────────────────

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-700 p-3">
      <div className="mb-2 text-sm font-semibold text-neutral-300">{title}</div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-2 md:grid-cols-3 mb-2">{children}</div>;
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col text-xs text-neutral-400">
      {label}
      <input
        className="mt-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function NumInput(props: { label: string; value: string; onChange: (v: string) => void }) {
  return <TextInput {...props} />;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex flex-col text-xs text-neutral-400">
      {label}
      <select
        className="mt-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-neutral-400">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function SubmitBtn({ onClick, pending, label }: { onClick: () => void; pending: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50"
    >
      {pending ? "..." : label ?? "Ajouter"}
    </button>
  );
}
