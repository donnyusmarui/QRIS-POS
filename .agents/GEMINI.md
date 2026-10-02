# [ S3 ORCHESTRATOR ] + [ V7LA SOVEREIGN HUB ] + gemini.md
# Status: NEXUS ACTIVE

## [PASAL 1] NEXUS TOOL DISPATCHER
Setiap instruksi harus dirouting ke TEPAT SATU alat.

## [PASAL 2] LAZY-LOAD PRINCIPLE
- DILARANG dump seluruh schema ke context.
- Fetch HANYA data yang relevan dengan task saat ini.

## [PASAL 3] KARPATHY CODING LAWS
- Think Before Coding: Tanya jika ambigu.
- Simplicity First: Kode minimal, zero abstraksi prematur.
- Surgical Changes: Hanya sentuh baris yang harus diubah.

## [PASAL 4] TRIPLE PERSISTENCE
Setelah setiap sub-task selesai, log semua histori.

## [PASAL 5] TOOL DEMARCATION
- Graphify vs MCP Memory: Graphify murni untuk AST/Dependency/God Nodes. MCP Memory murni untuk mencatat memori konseptual dan alasan arsitektural.
- GitHub MCP vs Graphify: github-mcp-server adalah satu-satunya pengepul data Git/PR. Graphify hanya menganalisis, bukan menarik data PR.
- magic-ui vs 21st-magic: Gunakan magic-ui dulu sebagai base registry UI, lalu gunakan 21st-magic hanya sebagai aesthetic refiner.

## [PASAL 6] ZERO-REDUNDANT DEMARCATION (v7la base+insForge+zeroredundant)
- Code & Architectural Memory: Gunakan LanceDB (Vector) & MCP Memory. DILARANG menyimpan snippet kode ke database InsForge.
- Application & User Data: Gunakan InsForge PostgreSQL (http://localhost:7130). DILARANG menyimpan data aplikasi user ke SQLite Auditor V7LA.
- Storage Bucket: Gunakan RAMDisk D:\ untuk temporary cache build, dan InsForge Storage S3 Bucket untuk file/media aplikasi permanent.

## [PASAL 7] DUAL-ENGINE HYBRID CAPABILITY
- Mode Base Only (v7 base): V7LA Base 2.0 berjalan 100% offline & independen tanpa dependensi InsForge.
- Mode Hybrid (v7 zero / v7 ins): Mengaktifkan integrasi BaaS InsForge Native Node.js (http://localhost:7130) + V7LA Client untuk BaaS, Auth, Database, dan Storage.

## [PASAL 8] INSFORGE MULTI-PROJECT DATA ISOLATION PROTOCOL
- ISOLASI STRIKTIF: Setiap operasi DB, Storage, dan Auth InsForge HARUS terisolasi penuh untuk proyek ini. DILARANG mencampur tabel, schema, atau bucket dengan proyek lain.
- DATABASE SCHEMA: DDL/Migration dibuat di bawah schema khusus (schema_<NAMA_PROYEK>) atau menggunakan project_id RLS policy (USING (project_id = '<NAMA_PROYEK>')).
- STORAGE BUCKETS: Wajib diawali nama proyek: <NAMA_PROYEK>-<tipe_bucket> (contoh: <NAMA_PROYEK>-assets).
- APP CONFIG (.env): Wajib membaca context dari .env lokal (INSFORGE_PROJECT_ID, INSFORGE_SCHEMA).
- MCP QUERIES: Penggunaan tool un-raw-sql / SDK InsForge SELALU menggunakan SET search_path TO schema_<NAMA_PROYEK>; atau WHERE project_id = '<NAMA_PROYEK>'.