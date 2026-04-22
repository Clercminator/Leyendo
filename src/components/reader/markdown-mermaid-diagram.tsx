"use client";

import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";

interface MarkdownMermaidDiagramProps {
  chart: string;
}

let hasConfiguredMermaid = false;

function configureMermaid() {
  if (hasConfiguredMermaid) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: "dark",
  });
  hasConfiguredMermaid = true;
}

export function MarkdownMermaidDiagram({
  chart,
}: MarkdownMermaidDiagramProps) {
  const { locale } = useLocale();
  const diagramId = useId().replace(/[:]/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        configureMermaid();
        const { svg, bindFunctions } = await mermaid.render(
          `leyendo-mermaid-${diagramId}`,
          chart,
        );

        if (cancelled || !containerRef.current) {
          return;
        }

        containerRef.current.innerHTML = svg;
        bindFunctions?.(containerRef.current);
        const svgElement = containerRef.current.querySelector("svg");

        if (svgElement) {
          svgElement.setAttribute("data-mermaid-diagram", "true");
          svgElement.setAttribute(
            "aria-label",
            getLocalizedCopy(locale, {
              en: "Mermaid diagram",
              es: "Diagrama Mermaid",
              pt: "Diagrama Mermaid",
            }),
          );
          svgElement.setAttribute("role", "img");
        }

        setRenderError(false);
      } catch {
        if (!cancelled) {
          setRenderError(true);
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart, diagramId, locale]);

  return (
    <figure className="reader-mermaid-figure" data-testid="reader-mermaid-diagram">
      <div
        ref={containerRef}
        className="reader-mermaid-diagram"
        aria-hidden={renderError ? "true" : undefined}
      />
      <details className="reader-mermaid-source">
        <summary>
          {renderError
            ? getLocalizedCopy(locale, {
                en: "Diagram source",
                es: "Fuente del diagrama",
                pt: "Fonte do diagrama",
              })
            : getLocalizedCopy(locale, {
                en: "Show diagram source",
                es: "Mostrar fuente del diagrama",
                pt: "Mostrar fonte do diagrama",
              })}
        </summary>
        <pre>
          <code>{chart}</code>
        </pre>
      </details>
      {renderError ? (
        <p className="reader-mermaid-error">
          {getLocalizedCopy(locale, {
            en: "Leyendo could not render this Mermaid diagram, but the source is still available below.",
            es: "Leyendo no pudo renderizar este diagrama Mermaid, pero la fuente sigue disponible abajo.",
            pt: "O Leyendo nao conseguiu renderizar este diagrama Mermaid, mas a fonte continua disponivel abaixo.",
          })}
        </p>
      ) : null}
    </figure>
  );
}