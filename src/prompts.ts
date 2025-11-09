// src/prompts.ts
/**
 * Reusable prompt patterns.
 */

import { multiselect, select, text } from "@clack/prompts";

export async function selectAction(
    message: string,
    options: Array<{ value: string; label: string }>,
): Promise<string> {
    return (await select({ message, options })) as string;
}

export async function selectMultiple(
    message: string,
    items: string[],
): Promise<string[]> {
    return (await multiselect({
        message,
        options: items.map((item) => ({ value: item, label: item })),
        required: false,
    })) as string[];
}

export async function inputText(
    message: string,
    defaultValue: string,
): Promise<string> {
    return (
        (await text({
            message,
            placeholder: defaultValue,
            defaultValue,
        })) as string
    ).trim();
}
