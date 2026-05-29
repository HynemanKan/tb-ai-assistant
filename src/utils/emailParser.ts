interface MessagePart {
  body?: string | undefined;
  contentType?: string | undefined;
  headers?: { [key: string]: string[] } | undefined;
  name?: string | undefined;
  partName?: string | undefined;
  parts?: MessagePart[] | undefined;
  size?: number | undefined;
}

const KEEP_STYLES = ["color", "background-color", "font-weight", "font-style", "text-decoration"];

function extractTextFromHtml(html: string): string {
  let result = html;

  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  result = result.replace(/<br\s*\/?>/gi, "\n");
  result = result.replace(/<\/p>/gi, "\n");
  result = result.replace(/<\/div>/gi, "\n");
  result = result.replace(/<\/li>/gi, "\n");
  result = result.replace(/<\/tr>/gi, "\n");
  result = result.replace(/<\/h[1-6]>/gi, "\n");

  result = result.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  result = result.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  result = result.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  result = result.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  result = result.replace(/<u[^>]*>(.*?)<\/u>/gi, "_$1_");
  result = result.replace(/<s[^>]*>(.*?)<\/s>/gi, "~$1~");
  result = result.replace(/<strike[^>]*>(.*?)<\/strike>/gi, "~$1~");

  result = result.replace(/<span[^>]*style="[^"]*color:\s*([^;"]+)[^"]*"[^>]*>(.*?)<\/span>/gi, '[$1]$2[/$1]');
  result = result.replace(/<font[^>]*color="([^"]*)"[^>]*>(.*?)<\/font>/gi, '[$1]$2[/$1]');

  result = result.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)");

  result = result.replace(/<li[^>]*>/gi, "• ");

  result = result.replace(/<[^>]+>/g, "");

  result = result.replace(/&nbsp;/g, " ");
  result = result.replace(/&amp;/g, "&");
  result = result.replace(/&lt;/g, "<");
  result = result.replace(/&gt;/g, ">");
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");

  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/[ \t]+/g, " ");
  result = result.trim();

  return result;
}

function cleanHtmlContent(html: string): string {
  let result = html;

  result = result.replace(/\s*(?:font-family|font-size|line-height|letter-spacing|text-align|margin|padding|border|width|height|display|position|float|clear|overflow|background-image|background-repeat|background-position|background-size)\s*:\s*[^;"}]+;?/gi, "");

  result = result.replace(/<([a-z]+)[^>]*style=""[^>]*>/gi, "<$1>");
  result = result.replace(/\s+style=";*"/gi, "");

  return result;
}

export function extractEmailContent(messagePart: MessagePart): string {
  const contents: string[] = [];

  function processPart(part: MessagePart) {
    if (part.body && part.contentType) {
      if (part.contentType.includes("text/plain")) {
        contents.push(part.body);
      } else if (part.contentType.includes("text/html")) {
        const cleanedHtml = cleanHtmlContent(part.body);
        const textContent = extractTextFromHtml(cleanedHtml);
        if (textContent) {
          contents.push(textContent);
        }
      }
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        processPart(subPart);
      }
    }
  }

  processPart(messagePart);

  const uniqueContents = [...new Set(contents.filter(c => c.trim()))];
  return uniqueContents.join("\n\n---\n\n");
}
