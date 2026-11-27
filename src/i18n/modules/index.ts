/** Register feature dictionaries here: each module exports { en, bn, es }. */
import { experience } from "./experience";
import { operations } from "./operations";
import { ai } from "./ai";
import { governance } from "./governance";
import { story } from "./story";

export const modules: { en: Record<string, string>; bn: Record<string, string>; es: Record<string, string> }[] = [experience, operations, ai, governance, story];
