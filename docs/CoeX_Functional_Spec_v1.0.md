CoeX Functional Specification v1.0

Part 1 — Foundation & Architecture Specification

⸻

1. Product Overview

Product Name

CoeX

Product Type

Local-first Product Knowledge & Context Management System

Primary Purpose

CoeX serves as the central operating system for managing digital products throughout their lifecycle.

The application acts as:

* Product Database
* Product Memory System
* Product Knowledge Repository
* Product Context Engine
* Product Development Workspace

The application is designed to become the single source of truth for every digital product being created, maintained, optimized, and sold.

⸻

2. Problem Statement

The current workflow requires switching between:

* ChatGPT
* Claude
* Gemini
* Image Generation Tools
* SEO Tools
* Documents
* Google Drive
* Google Sheets
* Canva
* Notes

As a result:

* Product knowledge becomes fragmented.
* Decisions are lost.
* Research is duplicated.
* Prompts become scattered.
* Context must be repeatedly explained.

CoeX solves this problem by becoming the permanent memory layer independent of any AI tool.

AI tools become temporary workers.

CoeX becomes the permanent brain.

⸻

3. Product Goals

Goal 1

Create a central repository for all products.

⸻

Goal 2

Store every important product decision.

⸻

Goal 3

Store reusable prompts.

⸻

Goal 4

Store AI work sessions.

⸻

Goal 5

Provide rapid context generation for future AI usage.

⸻

Goal 6

Support future AI integrations without major architectural changes.

⸻

4. Non Goals (MVP)

The following are explicitly excluded from MVP:

* Authentication
* Multi-user support
* Team collaboration
* Cloud sync
* Payments
* Etsy integrations
* AI Chat Interface
* Ollama Integration
* Vector Database
* Embedding Generation
* Semantic Search
* Agent Systems
* Automation Workflows
* Revenue Analytics
* Financial Reporting

The architecture must support these in future versions.

⸻

5. Core Philosophy

CoeX is Product-Centric.

Everything revolves around Products.

The application is not:

* Task Manager
* CRM
* Knowledge Base
* AI Assistant

It may contain elements of these systems.

However the Product remains the highest level entity.

⸻

6. Information Architecture

Hierarchy:

Workspace
→ Family
→ Product

Products contain:

Planning
Knowledge
Assets
Selling

Modules.

⸻

7. Workspace Layer

Workspaces exist in database architecture.

Workspaces are hidden in MVP UI.

All data initially belongs to:

Default Workspace

Purpose:

Future expansion without schema changes.

⸻

8. Family Layer

Families act as organizational containers.

Examples:

Resume Templates

Google Sheet Systems

Journals

Planners

Educational Resources

Families are not products.

Families are grouping structures.

Families contain products.

⸻

9. Product Layer

Products are the primary operational entity.

Examples:

Developer Resume

Nurse Resume

DevTrack OS

NEET OS

Daily Journal

Budget Planner

Products contain all working information.

⸻

10. Product Lifecycle

The lifecycle model is fixed.

Claude Code must not modify lifecycle states.

States:

IDEA

RESEARCH

PLANNING

CREATING

TESTING

READY_TO_SELL

PUBLISHED

OPTIMIZING

ARCHIVED

⸻

11. Product Status

The status model is fixed.

ACTIVE

PAUSED

BLOCKED

COMPLETED

ARCHIVED

Status and Lifecycle are independent.

Example:

Lifecycle:
TESTING

Status:
ACTIVE

⸻

12. Product Progress System

Products support multi-stage progress tracking.

Each lifecycle stage can be:

Not Started

In Progress

Completed

This enables roadmap-style visibility.

Example:

Research ✓

Planning ✓

Creating ✓

Testing ⟳

Ready To Sell □

Published □

⸻

13. Product Templates

CoeX must support product templates.

Templates are first-class entities.

Initial templates:

Google Sheet Product

Resume Product

Journal Product

Planner Product

Templates may define:

Default Milestones

Default Tasks

Default Context Blocks

Default Folder Structures

Default Notes

⸻

14. Storage Architecture

CoeX uses Hybrid Storage.

SQLite

Filesystem

SQLite stores metadata.

Filesystem stores files.

No file binaries should be stored in database.

⸻

15. Filesystem Architecture

Root:

storage/

Inside:

families/

products/

exports/

uploads/

Each product receives its own storage area.

Product folders must be generated automatically during creation.

Future AI indexing must be able to scan product folders directly.

⸻

16. Search Architecture

MVP Search Type:

Keyword Search

Scope:

Products

Tasks

Milestones

Research

Sessions

Prompts

Notes

Decisions

Context Blocks

Marketing

Versions

Assets

Links

Search must be global.

Search must return categorized results.

⸻

17. Notes System

Two note types exist.

Global Notes

Product Notes

Global Notes have no product association.

Product Notes belong to a product.

Both are searchable.

⸻

18. Context Block System

Context Blocks are mandatory.

Purpose:

Store highly curated product knowledge.

Examples:

Built with Google Sheets

Uses Apps Script

No External APIs

Mobile First

Target Audience: Developers

Future AI systems will prioritize Context Blocks before reading Sessions.

Context Blocks are considered high-value memory.

⸻

19. Session System

Sessions represent work completed with:

ChatGPT

Claude

Gemini

Manual Work

Other Tools

Each session contains:

Goal

Summary

Outcome

Next Steps

Optional Full Output

Sessions become part of product memory.

⸻

20. AI Compatibility Requirements

The database must be designed to support future:

Ollama

Local Models

Embeddings

Vector Databases

Semantic Search

Agent Systems

Every major entity should support future AI metadata storage.

Implementation approach may be determined by Claude Code.

However schema extensibility must be preserved.

⸻

21. Activity Tracking

Activity Tracking is mandatory.

All significant actions must generate activity logs.

Examples:

Product Created

Task Created

Task Completed

Asset Uploaded

Decision Added

Session Added

Prompt Updated

Milestone Completed

Activity Logs become part of product history.

⸻

22. Health Score

Health Score exists in MVP.

Claude Code should design a weighted scoring formula.

The score should reflect overall product completeness.

Potential inputs:

Milestones

Tasks

Context Completeness

Asset Completeness

Marketing Completeness

Documentation Completeness

Claude should recommend and implement the most maintainable formula.

⸻

23. Context Generator

Context Generator is a core MVP feature.

Purpose:

Generate concise AI-ready context packages.

Claude Code should design the exact formatting.

However generated context must prioritize:

1. Product Overview
2. Context Blocks
3. Current Lifecycle Stage
4. Current Status
5. Active Milestones
6. Open Tasks
7. Recent Decisions
8. Recent Sessions
9. Research Highlights
10. Important Assets
11. Marketing Information
12. Next Actions

The generated context should remain compact enough for use with AI tools.

⸻

24. Design Principles

Professional

Minimal

Fast

Information Dense

Productivity Focused

Desktop First

Responsive

Dark Mode

Light Mode

No consumer-style visual design.

No excessive animations.

No gimmicks.

The application should feel like a professional internal operating system.

⸻

25. Claude Code Authority Boundaries

Claude Code MAY decide:

* UI layout
* Component hierarchy
* Modal design
* Dashboard arrangement
* Form design
* Health score formula
* Context generation formatting
* Search UX
* Validation UX

Claude Code MUST NOT change:

* Product hierarchy
* Product lifecycle
* Status model
* Storage architecture
* Family → Product relationship
* Product template concept
* Context block system
* Session architecture
* Hybrid storage requirement
* Future AI compatibility requirements

Part 2 — Dashboard & Product Management Specification

⸻

1. Purpose

This document defines:

* Dashboard behavior
* Navigation structure
* Product creation workflow
* Product management workflow
* Family management workflow
* Every screen
* Every button
* Every modal
* Every CRUD action

The purpose is to eliminate ambiguity during implementation.

Claude Code may improve UX and layout, but must preserve all business requirements defined in this document.

⸻

2. Application Navigation

The application uses a persistent sidebar navigation.

Recommended Sections:

Dashboard

Products

Families

Notes

Search

Activity

Settings

The exact visual layout may be chosen by Claude Code.

Navigation must remain fast and require minimal clicks.

⸻

3. Dashboard

The Dashboard is the default landing page.

Its purpose is:

Not analytics.

Not reporting.

Its purpose is:

“What should I work on next?”

Dashboard should be productivity-first.

⸻

4. Dashboard Layout

The Dashboard should contain:

Section 1:
Today’s Focus

Section 2:
Product Pipeline

Section 3:
Recent Activity

Section 4:
Upcoming Work

Section 5:
Portfolio Overview

⸻

5. Dashboard — Today’s Focus

Highest priority section.

Purpose:

Immediately show what requires attention.

Display:

Products with Next Action defined.

Products currently blocked.

Products in Testing.

Products close to Ready To Sell.

Products with overdue tasks.

Recommended Display:

Card layout.

Each card should show:

Product Name

Family

Current Stage

Current Status

Health Score

Next Action

Quick Open Button

⸻

6. Dashboard — Product Pipeline

Display lifecycle distribution.

Example:

IDEA: 4

RESEARCH: 3

CREATING: 7

TESTING: 2

READY_TO_SELL: 5

PUBLISHED: 12

Purpose:

Understand product portfolio status.

Claude Code may determine visualization method.

⸻

7. Dashboard — Recent Activity

Display latest activity logs.

Examples:

Task Completed

Session Added

Asset Uploaded

Decision Added

Milestone Completed

Display:

Timestamp

Action

Related Product

Quick Open

⸻

8. Dashboard — Upcoming Work

Display:

Open Tasks

Upcoming Milestones

Blocked Items

Priority Items

Sorted by:

Critical

High

Medium

Low

⸻

9. Dashboard — Portfolio Overview

Display:

Total Products

Active Products

Published Products

Ready To Sell

Blocked Products

Average Health Score

This section is informational only.

⸻

10. Dashboard Buttons

Required Buttons:

Create Product

Create Family

Quick Capture

Global Search

Refresh Dashboard

Each button must function.

No placeholder actions.

⸻

11. Global Quick Capture

Quick Capture is available everywhere.

Recommended:

Floating Action Button.

Purpose:

Capture information rapidly.

⸻

12. Quick Capture Actions

Supported Types:

Task

Session

Decision

Note

Research Entry

Prompt

Context Block

Asset Link

User selects type.

Relevant form opens immediately.

Maximum two clicks from any screen.

⸻

13. Families Page

Purpose:

Manage product families.

Examples:

Resume Templates

Google Sheet Systems

Journals

Planners

⸻

14. Family List View

Display:

Family Name

Product Count

Last Updated

Status

Quick Actions

⸻

15. Family CRUD

User can:

Create Family

Edit Family

Archive Family

Delete Family

View Family

Delete should use confirmation dialog.

Soft delete preferred.

⸻

16. Create Family Modal

Fields:

Family Name

Description

Icon

Color

Notes

Validation:

Name required.

⸻

17. Family Detail Page

Displays:

Overview

Products

Activity

Notes

Related Information

Primary purpose:

Organize products.

Families do not contain operational work.

Operational work belongs to products.

⸻

18. Products Page

Purpose:

Central product management screen.

Display all products.

⸻

19. Product List View

Required Columns:

Product Name

Family

Template

Current Stage

Status

Health Score

Next Action

Last Updated

Quick Actions

⸻

20. Product List Actions

Open

Edit

Generate Context

Archive

Delete

Duplicate

⸻

21. Product Filtering

Required Filters:

Family

Template

Status

Lifecycle Stage

Health Score

Priority

Tags

Search Query

⸻

22. Product Sorting

Required Sort Options:

Name

Updated Date

Created Date

Health Score

Status

Stage

⸻

23. Product Creation Wizard

Product creation uses a multi-step wizard.

Simple forms are not acceptable.

Purpose:

Ensure complete setup.

⸻

24. Wizard Step 1

Select Family.

Options:

Existing Family

Create New Family

⸻

25. Wizard Step 2

Select Product Template.

Available:

Google Sheet Product

Resume Product

Journal Product

Planner Product

Future Templates

⸻

26. Wizard Step 3

Basic Information.

Fields:

Product Name

Description

Category

Target Customer

Priority

Initial Lifecycle Stage

Status

Tags

⸻

27. Wizard Step 4

Template Preview.

Display:

Tasks to be created.

Milestones to be created.

Context Blocks to be created.

Folder Structure to be created.

User confirms.

⸻

28. Wizard Step 5

Create Product.

System automatically:

Creates Database Records

Creates Product Folder Structure

Creates Default Tasks

Creates Default Milestones

Creates Default Context Blocks

Creates Activity Log Entry

⸻

29. Product Detail Page

This is the heart of CoeX.

Every product has a dedicated detail page.

⸻

30. Product Detail Header

Must display:

Product Name

Family

Template

Current Stage

Status

Health Score

Last Updated

Next Action

⸻

31. Product Detail Header Actions

Edit Product

Generate Context

Quick Capture

Archive Product

Export Product

Duplicate Product

⸻

32. Product Detail Layout

Must use grouped sections.

Not a flat tab structure.

Required Groups:

Overview

Planning

Knowledge

Assets

Selling

System

⸻

33. Overview Section

Displays:

Description

Target Customer

Status

Stage

Priority

Health Score

Next Action

Tags

Summary

⸻

34. Planning Section

Contains:

Tasks

Milestones

Decisions

⸻

35. Knowledge Section

Contains:

Research

Sessions

Prompts

Notes

Context Blocks

⸻

36. Assets Section

Contains:

Assets

Links

Exports

Attachments

⸻

37. Selling Section

Contains:

Marketing

Pricing

Versions

⸻

38. System Section

Contains:

Activity Logs

Metadata

Internal Information

⸻

39. Edit Product Modal

Fields:

All editable product fields.

Save Button

Cancel Button

Validation required.

⸻

40. Duplicate Product

Creates:

New Product

Copies:

Structure

Milestones

Tasks

Context Blocks

Optional:

Assets

Prompts

Research

User chooses.

⸻

41. Archive Product

Confirmation Modal Required.

Product remains recoverable.

No permanent deletion.

⸻

42. Delete Product

Optional.

If implemented:

Double Confirmation Required.

Soft Delete Only.

⸻

43. Generate Context Action

Core Feature.

Button available:

Dashboard

Product Detail

Product List

One-click generation.

Context appears in dedicated modal.

Copy Button required.

Export Button required.

⸻

44. Export Product

Supported Formats:

JSON

Markdown

CSV

Claude Code may add additional formats.

⸻

45. Product Relationships

Products may reference other products.

Relationship Types:

Related

Bundle

Dependency

Upsell

Reference

Display related products in Product Detail page.

⸻

46. Product Templates Management

Templates are manageable entities.

User can:

View Templates

Duplicate Templates

Edit Templates

Create New Templates

Template editor may be basic in MVP.

⸻

47. Empty States

Every screen must have meaningful empty states.

Examples:

No Products

No Families

No Tasks

No Sessions

No Research

No generic blank screens.

⸻

48. Activity Logging Requirements

Every major action creates log entries.

Examples:

Product Created

Product Edited

Product Archived

Task Created

Task Completed

Session Added

Asset Uploaded

Decision Added

Context Generated

Logs must appear immediately.

⸻

49. Search Entry Points

Search accessible from:

Sidebar

Dashboard

Header

Keyboard Shortcut (recommended)

⸻

50. MVP Success Criteria

CoeX MVP is considered successful when a user can:

Create Product Families

Create Products

Use Templates

Store Product Knowledge

Store AI Sessions

Store Research

Store Prompts

Store Notes

Store Assets

Generate Product Context

Search Everything

Track Progress

Manage Product Lifecycle

Continue Product Development Without Losing Context

The MVP should be fully usable as a daily operating system for managing digital products before any future AI integrations are added.

Part 3 — Knowledge System & Context Engine Specification

⸻

1. Purpose

This document defines the Knowledge Layer of CoeX.

The Knowledge Layer is the most important differentiator of CoeX.

Many applications can store products.

Many applications can store tasks.

Very few applications can preserve product knowledge over months and years.

The purpose of this layer is:

* Preserve knowledge
* Preserve decisions
* Preserve AI outputs
* Preserve research
* Preserve context
* Preserve history

Future AI systems will consume this layer.

The MVP must be designed with this future in mind.

⸻

2. Knowledge Architecture

Knowledge is organized into:

Research

Sessions

Prompts

Notes

Decisions

Context Blocks

Activity Logs

Relationships

These entities collectively form Product Memory.

⸻

3. Product Memory Philosophy

CoeX should be treated as:

Permanent Memory

AI tools should be treated as:

Temporary Workers

All important outputs eventually return to CoeX.

Knowledge should never remain trapped inside:

ChatGPT

Claude

Gemini

Other AI systems

⸻

4. Research System

Purpose:

Store product research.

Examples:

Competitor Research

Market Research

Pricing Research

Feature Research

Customer Research

Keyword Research

Industry Research

⸻

5. Research Entry Structure

Required Fields:

Title

Category

Content

Source

Tags

Date

Optional:

Attachments

Links

AI Metadata

⸻

6. Research Categories

Default Categories:

Competitor

Market

Customer

Pricing

Keywords

Feature Ideas

General

System must support custom categories.

⸻

7. Research Editor

Research entries must support:

Rich Text

Lists

Headings

Links

Code Blocks

Tables

Images

Future AI analysis depends on rich content.

⸻

8. Research Search

Search must support:

Title Search

Content Search

Tag Search

Category Search

Product Search

Global Search

⸻

9. Research Relationships

Research can reference:

Products

Sessions

Decisions

Notes

Prompts

Relationships should be visible.

⸻

10. Session System

Sessions are the core AI memory component.

Sessions represent work performed.

Examples:

ChatGPT Planning Session

Claude Coding Session

Gemini SEO Session

Manual Work Session

⸻

11. Session Structure

Required Fields:

Tool

Goal

Summary

Outcome

Next Steps

Date

Tags

Optional:

Full Output

Attachments

Generated Files

References

AI Metadata

⸻

12. Session Types

Supported Types:

ChatGPT

Claude

Gemini

Manual

Other

System must support future tools.

⸻

13. Session Philosophy

Sessions should not become raw chat storage.

Primary focus:

High-quality summaries.

Full outputs are optional.

Summaries remain the most important field.

⸻

14. Session Summary Format

Recommended Structure:

Goal

Work Completed

Decisions Made

Problems Encountered

Next Steps

This structure improves future retrieval.

⸻

15. Full Output Storage

Full outputs may contain:

Claude Responses

ChatGPT Responses

Gemini Responses

Generated Documentation

Code Snippets

Long Research

Storage must support large content.

⸻

16. Session Linking

Sessions may link to:

Tasks

Research

Assets

Decisions

Products

Prompts

This creates traceability.

⸻

17. Prompt Library System

Purpose:

Store reusable prompts.

Prompts are considered organizational assets.

⸻

18. Prompt Structure

Required Fields:

Title

Category

Prompt Content

Description

Tags

Created Date

Last Used

Favorite

⸻

19. Prompt Categories

Examples:

Research

Coding

SEO

Marketing

Design

Listing Creation

Image Generation

Planning

General

Custom Categories Supported.

⸻

20. Prompt Features

Required:

Create

Edit

Delete

Copy

Favorite

Search

Filter

Duplicate

⸻

21. Prompt Usage Tracking

Prompt usage should be tracked.

Fields:

Last Used

Usage Count

Associated Products

This enables future prompt optimization.

⸻

22. Notes System

Notes are lightweight knowledge capture.

Not every thought belongs in Research.

Not every thought belongs in Sessions.

Notes solve this problem.

⸻

23. Note Types

Global Notes

Product Notes

⸻

24. Global Notes

Not attached to products.

Examples:

Business Ideas

Future Plans

Product Concepts

System Improvements

Workflow Thoughts

⸻

25. Product Notes

Attached to products.

Examples:

Feature Ideas

Customer Feedback

Future Improvements

Quick Thoughts

⸻

26. Note Structure

Title

Content

Tags

Favorite

Created Date

Updated Date

⸻

27. Notes Search

Notes must be fully searchable.

Search Fields:

Title

Content

Tags

Product

⸻

28. Decisions System

Decisions are high-value knowledge.

The purpose is:

Remember why choices were made.

⸻

29. Decision Structure

Decision

Reason

Impact

Status

Date

Tags

References

⸻

30. Decision Status

Active

Superseded

Deprecated

Rejected

Archived

⸻

31. Decision Importance

Decisions are treated as permanent memory.

Future AI systems should prioritize decisions.

⸻

32. Context Block System

Context Blocks are the most important AI-ready feature.

Purpose:

Store highly curated context.

Not all knowledge belongs in sessions.

Not all knowledge belongs in notes.

Context Blocks represent truths about a product.

⸻

33. Context Block Examples

DevTrack OS:

Built in Google Sheets

Uses Apps Script

Mobile First

No External APIs

Target Audience: Developers

⸻

Resume Product:

Created in Canva

ATS Friendly

US Market Focus

PDF Delivery

⸻

34. Context Block Structure

Title

Content

Priority

Status

Created Date

Updated Date

⸻

35. Context Block Priority

Critical

High

Normal

Low

Future AI systems should prioritize by priority level.

⸻

36. Context Block Status

Active

Inactive

Archived

Only Active blocks are included in generated context.

⸻

37. Context Generator

Context Generator is a primary MVP feature.

Purpose:

Produce AI-ready context packages.

⸻

38. Context Generator Inputs

Must consider:

Overview

Context Blocks

Current Stage

Status

Milestones

Tasks

Decisions

Sessions

Research

Marketing

Assets

Links

Versions

⸻

39. Context Generator Prioritization

Highest Priority:

Context Blocks

Recent Decisions

Current Status

Current Stage

Open Tasks

Recent Sessions

Research Highlights

Important Assets

Marketing Notes

⸻

40. Context Generator Output Goals

Output should be:

Concise

Readable

Structured

AI Friendly

Portable

Copy/Paste Ready

⸻

41. Context Generator Output Sections

Recommended Sections:

Product Overview

Current State

Important Context

Open Work

Recent Decisions

Recent Sessions

Research Highlights

Important Assets

Marketing Notes

Next Actions

⸻

42. Context Length

Claude Code should determine final formatting.

However:

Output should remain practical for AI usage.

Avoid unnecessary verbosity.

⸻

43. Search System

Global Search is mandatory.

Search is a primary feature.

⸻

44. Search Scope

Products

Families

Tasks

Milestones

Research

Sessions

Prompts

Notes

Decisions

Context Blocks

Assets

Links

Marketing

Versions

Activity Logs

Everything.

⸻

45. Search Result Structure

Results should be grouped by entity type.

Example:

Products

Sessions

Research

Notes

Prompts

Assets

This improves usability.

⸻

46. Search Ranking

Claude Code should determine ranking logic.

However prioritize:

Exact Matches

Title Matches

Tag Matches

Content Matches

Recent Activity

⸻

47. AI Metadata Strategy

Every major knowledge entity should support future AI metadata.

Implementation details may be chosen by Claude Code.

Examples:

Tags

Keywords

Summaries

Embeddings References

Classification Data

Future Generated Insights

⸻

48. Future AI Compatibility

MVP does not implement:

Ollama

Embeddings

Vector Databases

Semantic Search

Agent Systems

However architecture must support them.

⸻

49. Future AI Layer Vision

Future AI systems may:

Generate Summaries

Suggest Tasks

Generate Context

Recommend Actions

Analyze Research

Find Relationships

Suggest Product Improvements

Search Semantically

No schema redesign should be required.

⸻

50. Knowledge Layer Success Criteria

The Knowledge Layer is successful when:

A user can stop losing product knowledge.

A user can return to a product months later and immediately understand:

Current State

Past Decisions

Research Conducted

Work Completed

Outstanding Tasks

Important Context

Future Direction

The system should function as a permanent external memory for all products regardless of which AI tools are used in the future.

Part 4 — Technical Implementation & Engineering Specification

⸻

1. Purpose

This document defines the technical implementation requirements for CoeX.

Parts 1–3 define business behavior.

Part 4 defines engineering behavior.

The objective is to ensure CoeX is:

* Maintainable
* Scalable
* Extensible
* AI Ready
* Production Quality

Claude Code should treat this document as implementation guidance.

⸻

2. Technology Stack

Frontend

Required:

* Next.js
* TypeScript
* Tailwind CSS

Recommended:

* Shadcn UI
* React Hook Form
* TanStack Table
* TanStack Query
* Zustand

Claude Code may recommend alternatives if clearly justified.

⸻

Backend

Required:

* Flask
* Python

Recommended:

* Flask Blueprint Architecture
* SQLAlchemy
* Alembic

⸻

Database

Required:

SQLite

Single Database File

Future migration compatibility required.

⸻

Storage

Required:

Hybrid Storage

SQLite

Filesystem

Database stores metadata.

Filesystem stores files.

⸻

3. Architecture Principles

CoeX must follow:

Modular Architecture

Separation of Concerns

Reusable Components

Service Layer Pattern

Repository Pattern

Type Safety

Future AI Compatibility

Avoid monolithic code structures.

⸻

4. Backend Architecture

Recommended Structure:

backend/

app/

api/

services/

repositories/

models/

schemas/

utils/

storage/

database/

migrations/

Claude Code may improve structure.

Business separation must remain.

⸻

5. Frontend Architecture

Recommended Structure:

frontend/

app/

components/

features/

hooks/

services/

types/

utils/

store/

Each domain should own its UI components.

Avoid giant shared component folders.

⸻

6. API Design

Use REST API architecture.

Required Principles:

Predictable Routes

Consistent Responses

Validation

Error Handling

Pagination

Filtering

Search

⸻

7. API Response Format

Success Response:

success

data

message

metadata

Error Response:

success

error

details

timestamp

Claude Code may define exact JSON format.

Consistency is mandatory.

⸻

8. CRUD Requirements

Every major entity requires:

Create

Read

Update

Delete

Soft Delete Preferred

Entities:

Families

Products

Tasks

Milestones

Research

Sessions

Prompts

Notes

Decisions

Context Blocks

Assets

Links

Marketing

Pricing

Versions

Templates

⸻

9. Validation Layer

Validation must exist on:

Frontend

Backend

Both layers required.

⸻

10. Validation Philosophy

Never trust frontend validation alone.

Backend remains authoritative.

⸻

11. File Storage System

Filesystem must be organized.

Example:

storage/

families/

products/

uploads/

exports/

Each product receives dedicated storage.

Folder generation occurs automatically.

⸻

12. Product Folder Structure

Example:

products/

devtrack-os/

assets/

exports/

sessions/

marketing/

generated/

Future AI systems may scan these folders.

Structure must remain predictable.

⸻

13. Asset Handling

Required Features:

Upload

Rename

Delete

Move

Preview

Download

Asset metadata stored in database.

File stored in filesystem.

⸻

14. Asset Types

Support:

PDF

PNG

JPG

JPEG

WEBP

SVG

DOCX

XLSX

CSV

ZIP

TXT

Markdown

Links

Additional formats should be easy to add.

⸻

15. Search Architecture

MVP Search Type:

Keyword Search

Search must support:

Titles

Descriptions

Tags

Content

Metadata

Search implementation may be selected by Claude Code.

⸻

16. Search Performance

Results should feel immediate.

Implement indexing where appropriate.

Design with future semantic search compatibility.

⸻

17. Activity Logging

Mandatory.

Every significant action generates logs.

Examples:

Product Created

Product Updated

Task Created

Task Completed

Asset Uploaded

Session Added

Context Generated

Prompt Updated

Decision Added

⸻

18. Activity Log Design

Logs should contain:

Entity Type

Entity ID

Action

Description

Timestamp

Related Product

User field optional for future use.

⸻

19. Health Score System

Health Score exists in MVP.

Claude Code should design the exact formula.

⸻

20. Health Score Requirements

Score Range:

0–100

Factors may include:

Milestone Completion

Task Completion

Research Completeness

Context Block Completeness

Asset Completeness

Marketing Completeness

Documentation Completeness

Claude should create a maintainable weighted model.

⸻

21. Health Score Behavior

Automatically recalculate:

On Product Update

On Task Completion

On Milestone Completion

On Asset Addition

On Context Block Update

On Marketing Update

⸻

22. Context Generator Engine

Core Feature.

Context generation must not rely on AI.

MVP is deterministic.

⸻

23. Context Generator Process

System gathers:

Product Overview

Context Blocks

Open Tasks

Recent Decisions

Recent Sessions

Research Highlights

Assets

Marketing Data

Versions

Next Actions

Produces structured output.

⸻

24. Context Generator Requirements

One Click Generation

Copy Button

Export Button

Preview Window

Fast Response

No AI dependency

⸻

25. Export System

Required Formats:

JSON

CSV

Markdown

Additional formats optional.

⸻

26. Export Philosophy

User owns data.

Data portability is important.

Exports should be complete.

⸻

27. Import System

Support:

JSON

CSV

Bulk Import

Manual Import

Import validation required.

⸻

28. Template Engine

Templates are first-class entities.

Templates can define:

Tasks

Milestones

Context Blocks

Folder Structures

Notes

Defaults

⸻

29. Template Application

When creating products:

Template automatically generates:

Records

Folders

Default Content

Activity Logs

⸻

30. Product Duplication

Product duplication required.

Options:

Duplicate Structure Only

Duplicate Structure + Knowledge

Duplicate Everything

User selects behavior.

⸻

31. Soft Delete Strategy

Preferred:

deleted_at field

Records recoverable.

No permanent deletion by default.

⸻

32. Recovery System

Users should be able to:

Restore Products

Restore Families

Restore Knowledge

Restore Assets Metadata

Future Trash system encouraged.

⸻

33. State Management

Frontend state should be centralized.

Claude Code may choose implementation.

Recommended:

Zustand

React Query

Combination approach.

⸻

34. Error Handling

Every operation requires:

User-Friendly Errors

Developer Logging

Recovery Guidance

No silent failures.

⸻

35. Loading States

All async actions require:

Loading Indicators

Skeletons

Progress Feedback

No frozen UI.

⸻

36. Empty States

Every screen requires:

Meaningful Empty State

Action Suggestions

Clear Next Steps

⸻

37. Responsive Design

Desktop First

Tablet Friendly

Mobile Usable

Primary use expected on desktop.

⸻

38. Theme Support

Required:

Dark Mode

Light Mode

Theme persistence required.

⸻

39. Accessibility

Basic accessibility required.

Keyboard navigation encouraged.

Search shortcut encouraged.

Readable contrast required.

⸻

40. Performance Targets

CoeX should feel fast.

Target:

Sub-second navigation

Fast search

Fast CRUD

Fast context generation

Performance takes priority over visual effects.

⸻

41. Logging & Debugging

Backend logging required.

Frontend error logging encouraged.

Logs should support future troubleshooting.

⸻

42. Database Design Rules

Foreign Keys Required

Indexes Required

Timestamps Required

Soft Delete Support

Future AI Compatibility Preserved

No denormalized shortcuts unless justified.

⸻

43. Future AI Integration Layer

MVP does not implement AI.

Architecture must support:

Ollama

Qwen

Llama

Embeddings

Vector Databases

RAG

Agent Systems

Future integrations should be additive.

No schema redesign should be required.

⸻

44. Future Vector Search Compatibility

Knowledge entities should support future:

Embedding References

Vector IDs

AI Metadata

Classification Data

Implementation deferred.

Compatibility required.

⸻

45. Future AI Workflows

Possible Future Features:

Semantic Search

Context Suggestions

Prompt Generation

Research Summaries

Task Suggestions

Relationship Discovery

Knowledge Graphs

Architecture should remain open for expansion.

⸻

46. Security Requirements

MVP is local-first.

Basic security still required:

Input Validation

File Validation

Path Traversal Protection

Safe Upload Handling

Secure File Access

⸻

47. Code Quality Requirements

Production Quality

Readable

Modular

Documented

Consistent Naming

Minimal Technical Debt

No placeholder logic

No unfinished screens

No fake buttons

All actions functional

⸻

48. Testing Requirements

Claude Code should implement reasonable testing strategy.

Recommended:

Unit Tests

API Tests

Validation Tests

Critical Workflow Tests

Testing scope may be adjusted if necessary.

⸻

49. MVP Completion Criteria

The MVP is complete when a user can:

Create Families

Create Products

Apply Templates

Store Knowledge

Store Sessions

Store Research

Store Notes

Store Prompts

Store Assets

Store Context Blocks

Generate Context

Search Everything

Track Progress

Manage Product Lifecycle

Restore Archived Data

Export Data

Import Data

Use CoeX daily without losing product context.

⸻

50. Final Engineering Directive

CoeX must be implemented as a real working system.

Not a prototype.

Not a demo.

Not a UI mockup.

All buttons must function.

All forms must validate.

All CRUD operations must work.

All storage operations must work.

All context generation must work.

All search functionality must work.

The result should be immediately usable for managing real digital products and should serve as the foundation for future AI-powered product memory and context management systems.

Part 5 — Implementation Strategy & Build Order

⸻

1. Purpose

This document defines the implementation sequence for CoeX.

The goal is to ensure:

* Stable architecture
* Minimal rework
* Connected features
* Functional milestones
* Production-quality implementation

Claude Code must follow this build order.

Features should not be built out of sequence unless required by dependencies.

⸻

2. Core Principle

Build foundations before features.

Incorrect approach:

Build Dashboard
→ Build Search
→ Build Templates
→ Build Context Generator

This creates duplication and rework.

Correct approach:

Database
→ Backend
→ Core Entities
→ Knowledge Layer
→ Search
→ Context Generator
→ Dashboard

Every feature should be built on completed foundations.

⸻

3. Development Phases

CoeX MVP implementation is divided into:

Phase 1:
Core Infrastructure

Phase 2:
Core Product Management

Phase 3:
Knowledge Layer

Phase 4:
Asset & Storage Layer

Phase 5:
Search System

Phase 6:
Context Engine

Phase 7:
Dashboard & Productivity Layer

Phase 8:
Polish & Production Readiness

⸻

4. Phase 1 — Core Infrastructure

Goal:

Create stable project foundation.

Deliverables:

Project Structure

Database Setup

API Architecture

Storage Architecture

State Management

Theme Support

Navigation Shell

⸻

5. Phase 1 Tasks

Backend

Setup Flask Architecture

Setup SQLAlchemy

Setup Alembic

Database Initialization

Configuration Management

Storage Services

Logging Services

⸻

6. Phase 1 Completion Criteria

Application launches successfully.

Database initializes successfully.

Navigation functions.

Dark/Light mode works.

Storage directories created automatically.

⸻

7. Phase 2 — Core Product Management

Goal:

Create CoeX foundation entities.

⸻

8. Phase 2 Entities

Workspaces

Families

Products

Templates

Product Progress

Product Relationships

⸻

9. Phase 2 Backend

Create:

Models

Repositories

Services

Validators

API Endpoints

⸻

10. Phase 2 Frontend

Create:

Family Pages

Product Pages

Template Pages

Creation Wizards

Edit Forms

Delete Workflows

Archive Workflows

⸻

11. Product Creation Wizard

Must be completed in this phase.

Requirements:

Family Selection

Template Selection

Metadata Collection

Folder Creation

Default Structure Generation

⸻

12. Product Template System

Must be completed before Knowledge Layer.

Templates generate:

Tasks

Milestones

Context Blocks

Folders

Default Notes

⸻

13. Phase 2 Completion Criteria

User can:

Create Families

Create Products

Use Templates

Edit Products

Archive Products

Duplicate Products

⸻

14. Phase 3 — Knowledge Layer

Goal:

Implement Product Memory System.

⸻

15. Phase 3 Entities

Research

Sessions

Prompts

Notes

Decisions

Context Blocks

⸻

16. Knowledge Layer Build Order

Notes

Decisions

Research

Prompts

Sessions

Context Blocks

⸻

17. Knowledge Layer Requirements

All CRUD completed.

Searchable.

Linkable to Products.

Activity Logging integrated.

⸻

18. Session System

Must support:

Summary

Full Output

Attachments

References

Future AI Metadata

⸻

19. Context Block System

Must be fully implemented.

This is a mandatory MVP feature.

Context Blocks are future AI foundations.

⸻

20. Phase 3 Completion Criteria

User can:

Store Knowledge

Store AI Sessions

Store Research

Store Prompts

Store Notes

Store Decisions

Store Context Blocks

⸻

21. Phase 4 — Asset & Storage Layer

Goal:

Implement file management.

⸻

22. Asset Layer Components

Assets

Links

Exports

File Uploads

Storage Management

⸻

23. Asset Features

Upload

Preview

Rename

Delete

Download

Categorization

Tagging

⸻

24. Filesystem Creation

Every Product receives:

assets/

exports/

sessions/

marketing/

generated/

Folders automatically.

⸻

25. Asset Metadata

Stored in database.

Files stored in filesystem.

⸻

26. Phase 4 Completion Criteria

User can:

Upload Files

Manage Assets

Manage Links

Browse Product Files

⸻

27. Phase 5 — Search System

Goal:

Implement Global Search.

⸻

28. Search Scope

Products

Families

Tasks

Milestones

Research

Sessions

Prompts

Notes

Decisions

Context Blocks

Assets

Links

Marketing

Versions

Activity Logs

⸻

29. Search Requirements

Fast

Global

Grouped Results

Filter Support

Keyword Based

⸻

30. Search Build Order

Entity Search

Cross Entity Search

Filters

Ranking

UI Polish

⸻

31. Phase 5 Completion Criteria

User can search entire CoeX.

Search returns categorized results.

⸻

32. Phase 6 — Context Engine

Goal:

Implement Context Generation.

⸻

33. Context Engine Inputs

Overview

Context Blocks

Status

Stage

Tasks

Milestones

Decisions

Sessions

Research

Assets

Marketing

Versions

⸻

34. Context Engine Processing

Claude Code should determine implementation.

Must remain deterministic.

No AI dependency.

⸻

35. Context Output

Copy Ready

Export Ready

Human Readable

AI Friendly

⸻

36. Context Features

Generate

Preview

Copy

Export

Regenerate

⸻

37. Phase 6 Completion Criteria

User can generate context packages for any product.

⸻

38. Phase 7 — Dashboard & Productivity Layer

Goal:

Build operational workspace.

⸻

39. Dashboard Components

Today’s Focus

Product Pipeline

Recent Activity

Upcoming Work

Portfolio Overview

⸻

40. Productivity Features

Quick Capture

Recent Work

Priority Products

Blocked Products

Overdue Tasks

⸻

41. Dashboard Data Sources

Products

Tasks

Milestones

Sessions

Activity Logs

Health Scores

⸻

42. Health Score System

Implement in this phase.

Claude Code designs formula.

Must be:

Understandable

Maintainable

Automatic

⸻

43. Activity Timeline

Implement full activity feeds.

Global Timeline

Product Timeline

Entity Timeline

⸻

44. Phase 7 Completion Criteria

Dashboard becomes daily command center.

⸻

45. Phase 8 — Polish & Production Readiness

Goal:

Transform MVP into production-ready application.

⸻

46. UX Review

Review:

Navigation

Forms

Workflows

Empty States

Loading States

Errors

Responsiveness

⸻

47. Performance Review

Review:

Search

CRUD Operations

Context Generation

Asset Handling

Page Loading

⸻

48. Data Integrity Review

Verify:

Relationships

Soft Deletes

Validation

Storage

Activity Logs

Imports

Exports

⸻

49. MVP Acceptance Checklist

All CRUD operations functional.

All forms validated.

All activity logs generated.

All searches functional.

All exports functional.

All imports functional.

All templates functional.

All context generation functional.

All storage operations functional.

No placeholder pages.

No non-working buttons.

No unfinished workflows.

⸻

50. Final Claude Code Directive

Implementation priority is:

Reliability
→ Data Integrity
→ Usability
→ Extensibility
→ Visual Polish

Do not sacrifice architecture quality for speed.

CoeX must be built as a long-term foundation capable of supporting future:

Ollama Integration

Embeddings

Vector Databases

Semantic Search

AI Context Generation

Agent Systems

without requiring architectural redesign.

The completed MVP should be immediately usable as a daily operating system for managing real digital products and preserving product knowledge across all AI tools and workflows.
