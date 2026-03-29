## Purpose

Defines the lightweight plugin framework allowing external code to react to alignment loading via the ModuleListener interface and MauveModule entry point, without modifying Mauve's core.

## Requirements

### Requirement: Module listener interface
The system SHALL provide a `ModuleListener` interface with a single `startModule(MauveFrame frame)` method that is invoked when a model is loaded, allowing external code to react to alignment loading without modifying Mauve's core.

#### Scenario: Plugin receives notification
- **WHEN** external code creates a `MauveModule(listener)`, calls `init(filename)`, and the alignment loads
- **THEN** system invokes `listener.startModule(frame)` with the MauveFrame containing the loaded model

### Requirement: MauveModule entry point
The system SHALL provide `MauveModule` (extends `Mauve`) that accepts a `ModuleListener` and creates `MauveModuleFrame` instances which call the listener on model load.

#### Scenario: Custom analysis plugin
- **WHEN** a developer creates a class implementing `ModuleListener` and passes it to `MauveModule`
- **THEN** the developer can access the full MauveFrame API (model, genomes, alignments, GUI) in the startModule callback to add custom analysis or visualization
