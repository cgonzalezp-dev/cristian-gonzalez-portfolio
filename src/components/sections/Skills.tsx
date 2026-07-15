import { skills } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { Tabs, type TabItem } from "@/components/ui/Tabs";

const tabs: TabItem[] = skills.map((group) => ({
  label: group.category,
  content: (
    <div className="flex flex-wrap gap-2">
      {group.items.map((item) => (
        <Badge key={item}>{item}</Badge>
      ))}
    </div>
  ),
}));

export function Skills() {
  return (
    <Section id="skills" eyebrow="Skills" heading="What I bring to the room.">
      <Tabs items={tabs} />
    </Section>
  );
}
