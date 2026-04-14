import React, { useState } from "react";
import { render, Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { STEPS } from "./steps.js";
import { buildDiff, applySettings } from "./writer.js";

const h = React.createElement;

function Wizard() {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("asking");

  const resolvedSteps = STEPS.filter(
    (s) => !s.skip || !s.skip(answers),
  );

  if (phase === "done") {
    return h(Box, { flexDirection: "column", paddingLeft: 1 },
      h(Text, { color: "green" }, "\u2713 Settings written."),
      h(Text, { dimColor: true }, "  Restart Claude Code to apply."),
    );
  }

  if (phase === "confirm") {
    const { before, after } = buildDiff(answers);
    return h(Box, { flexDirection: "column", paddingLeft: 1 },
      h(Text, { bold: true }, "\u2500\u2500 Review \u2500\u2500"),
      h(Text, null, ""),
      before && h(React.Fragment, null,
        h(Text, { dimColor: true }, "Before:"),
        h(Text, { dimColor: true }, "  " + JSON.stringify(before)),
        h(Text, null, ""),
      ),
      h(Text, { color: "green" }, "After:"),
      h(Text, { color: "green" }, "  " + JSON.stringify(after)),
      h(Text, null, ""),
      h(Text, { bold: true }, "Apply?"),
      h(SelectInput, {
        items: [
          { label: "Yes \u2014 write to ~/.claude/settings.json", value: "yes" },
          { label: "No \u2014 cancel", value: "no" },
        ],
        onSelect: (item) => {
          if (item.value === "yes") {
            applySettings(answers);
            setPhase("done");
          } else {
            process.exit(0);
          }
        },
      }),
    );
  }

  const currentStep = resolvedSteps[stepIdx];
  if (!currentStep) {
    setPhase("confirm");
    return null;
  }

  const progress = `(${stepIdx + 1}/${resolvedSteps.length})`;

  return h(Box, { flexDirection: "column", paddingLeft: 1 },
    h(Text, { bold: true, color: "cyan" }, "\uD83D\uDC3E claude-cat configure"),
    h(Text, null, ""),
    h(Text, { bold: true }, `${progress} ${currentStep.label}`),
    h(Text, { dimColor: true }, "  " + currentStep.description),
    h(Text, null, ""),
    h(SelectInput, {
      items: currentStep.items,
      onSelect: (item) => {
        const next = { ...answers, [currentStep.id]: item.value };
        setAnswers(next);

        const remaining = STEPS.filter(
          (s) => !s.skip || !s.skip(next),
        );
        if (stepIdx + 1 >= remaining.length) {
          setPhase("confirm");
        } else {
          setStepIdx(stepIdx + 1);
        }
      },
    }),
  );
}

export function run() {
  render(h(Wizard));
}
