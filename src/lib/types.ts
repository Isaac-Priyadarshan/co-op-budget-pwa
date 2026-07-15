// src/lib/types.ts
// LEFTOVER-01 FIX: This file is a deliberate, minimal re-export shim.
// It exists so that any legacy import path `from '../lib/types'` continues
// to resolve without breaking changes. The canonical source of truth for
// AppUser is src/lib/constants.ts. Do not add new types here — add them
// in src/types/ (for domain types) or src/lib/constants.ts (for app-wide
// constants and primitives).
export type { AppUser } from './constants'
