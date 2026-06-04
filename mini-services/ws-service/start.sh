#!/bin/bash
cd "$(dirname "$0")"
exec bun --hot index.ts
