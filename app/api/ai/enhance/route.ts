import { getCurrentUserId } from "@/lib/user-session";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 30;

const editorJSBlockSchema = z.object({
  type: z.enum([
    "paragraph",
    "header",
    "list",
    "checklist",
    "quote",
    "code",
    "delimiter",
  ]),
  data: z.record(z.any()),
});

const editorJSOutputSchema = z.object({
  time: z.number(),
  blocks: z.array(editorJSBlockSchema),
  version: z.string().optional(),
});

const SYSTEM_PROMPT = `Você é um assistente que melhora e formata texto para o formato EditorJS.

FUNÇÃO PRINCIPAL:
- Receber texto do usuário e melhorar/enriquecer o conteúdo
- Escolher o tipo de bloco mais apropriado baseado no CONTEÚDO, não em palavras-chave

REGRAS:
1. Analise o SIGNIFICADO do texto, não apenas palavras específicas
2. Use paragraph para textos corridos, descrições, explicações
3. Use list apenas quando o conteúdo for REALMENTE uma enumeração de itens distintos
4. Use header para títulos de seções
5. Use quote para citações
6. Use checklist para tarefas a fazer
7. Mantenha português brasileiro
8. Não invente conteúdo - apenas melhore o que foi dado

ESTRUTURA DE SAÍDA:
{
  "time": 0,
  "blocks": [/* blocos */],
  "version": "2.28.2"
}

FUNÇÃO DOS BLOCOS:
- paragraph: textos corridos, descrições, explicações
- header: títulos de seções
- list: enumerações de itens distintos
- checklist: listas de tarefas a fazer
- quote: citações
- delimiter: separadores visuais
- code: trechos de código

BLOCOS DISPONÍVEIS:
- paragraph: { "type": "paragraph", "data": { "text": "..." } }
- header: { "type": "header", "data": { "text": "...", "level": 3 } }
- list: { "type": "list", "data": { "style": "ordered|unordered", "items": ["...", "..."] } }
- checklist: { "type": "checklist", "data": { "items": [{ "text": "...", "checked": false }] } }
- quote: { "type": "quote", "data": { "text": "...", "caption": "" } }
- delimiter: { "type": "delimiter", "data": {} }
- code: { "type": "code", "data": { "code": "..." } }

IMPORTANTE para listas: NÃO adicione numeração manual (ex: "1. Item"). O EditorJS numera automaticamente.`;

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Chave da API OpenAI não configurada. Configure a variável de ambiente OPENAI_API_KEY.",
        },
        { status: 400 }
      );
    }

    const { text, context } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Texto é obrigatório" },
        { status: 400 }
      );
    }

    const openai = createOpenAI({ apiKey });

    const userPrompt = context
      ? `Contexto da tarefa: ${context}\n\nTexto a melhorar:\n${text}`
      : `Texto a melhorar:\n${text}`;

    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: editorJSOutputSchema,
    });

    // Pós-processar os blocos para garantir formato correto do EditorJS
    const processedBlocks = result.object.blocks.map((block) => {
      if (block.type === "list" && block.data.items) {
        // Converter items para array de strings e remover numeração manual
        const items = block.data.items.map((item: unknown) => {
          let text = "";
          if (typeof item === "string") {
            text = item;
          } else if (typeof item === "object" && item !== null) {
            const obj = item as Record<string, unknown>;
            text = String(obj.content || obj.text || "");
          } else {
            text = String(item);
          }
          // Remover numeração manual do início (ex: "1. ", "2) ", "1- ")
          return text.replace(/^\d+[\.\)\-]\s*/, "");
        });
        return {
          ...block,
          data: {
            ...block.data,
            items,
          },
        };
      }
      return block;
    });

    // Garantir que o time está atualizado
    const output = {
      time: Date.now(),
      blocks: processedBlocks,
      version: "2.28.2",
    };

    return NextResponse.json(output);
  } catch (error) {
    console.error("AI Enhance API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar a solicitação",
      },
      { status: 500 }
    );
  }
}
