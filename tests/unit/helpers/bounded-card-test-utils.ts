import { cyrb53 } from "src/utils/strings";

function splitTopicPrefix(text: string): [string, string] {
    const topics: string[] = [];
    let remainder = text.trimStart();
    while (remainder.startsWith("#")) {
        const match = remainder.match(/^#[^\s#]+/);
        if (!match) {
            break;
        }
        topics.push(match[0]);
        remainder = remainder.slice(match[0].length).trimStart();
    }

    return [topics.join(" "), remainder];
}

function convertInlineCardLine(line: string, lineIndex: number): string | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.includes("```") || trimmed.startsWith("<!--")) {
        return null;
    }

    const scheduleMatch = trimmed.match(/\s+(<!--SR:.+?-->)$/);
    const schedule = scheduleMatch?.[1] ?? null;
    const withoutSchedule = schedule ? trimmed.slice(0, scheduleMatch.index).trimEnd() : trimmed;
    const [topicPrefix, cardText] = splitTopicPrefix(withoutSchedule);
    const separator = cardText.includes(":::") ? ":::" : cardText.includes("::") ? "::" : null;
    if (!separator) {
        return null;
    }

    const separatorIndex = cardText.indexOf(separator);
    const front = cardText.slice(0, separatorIndex);
    const back = cardText.slice(separatorIndex + separator.length);
    if (!front || !back) {
        return null;
    }

    const id = `^sr-test-${cyrb53(`${lineIndex}:${line}`)}`;
    const topicLine = topicPrefix ? `${topicPrefix}\n` : "";
    const scheduleLine = schedule ? `\n${schedule}` : "";
    return `${topicLine}===front===
${front}
===back===
${back}
===end=== ${id}${scheduleLine}`;
}

export function convertLegacyInlineCardsToBounded(text: string): string {
    return text
        .replaceAll(/\r\n|\r/g, "\n")
        .split("\n")
        .map((line, index) => convertInlineCardLine(line, index) ?? line)
        .join("\n");
}
