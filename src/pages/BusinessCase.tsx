import { StrategyHero } from "@/components/strategy/StrategyHero";
import { ExecutiveSummary } from "@/components/strategy/ExecutiveSummary";
import { CurrentState } from "@/components/strategy/CurrentState";
import { Swot } from "@/components/strategy/Swot";
import { Framework } from "@/components/strategy/Framework";
import { Roadmap } from "@/components/strategy/Roadmap";
import { CommercialModel } from "@/components/strategy/CommercialModel";
import { Metrics } from "@/components/strategy/Metrics";
import { VoiceAndCI } from "@/components/strategy/VoiceAndCI";
import { BusinessImpact } from "@/components/strategy/BusinessImpact";
import { ProofStory } from "@/components/strategy/ProofStory";
import { StrategyCta } from "@/components/strategy/StrategyCta";

export function BusinessCase() {
  return (
    <main>
      <StrategyHero />
      <ExecutiveSummary />
      <CurrentState />
      <Swot />
      <Framework />
      <BusinessImpact />
      <Roadmap />
      <CommercialModel />
      <Metrics />
      <VoiceAndCI />
      <ProofStory />
      <StrategyCta />
    </main>
  );
}
