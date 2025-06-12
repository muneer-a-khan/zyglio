# YAML to Simulation Generation

## Overview

The Voice Procedural Craftsman now includes automatic generation of simulation objects, scenarios, and triggers based on YAML procedure definitions. This feature intelligently parses YAML content and creates comprehensive simulation elements to enhance the learning experience.

## How It Works

### 1. YAML Parsing
The system parses YAML procedure definitions using the `js-yaml` library and extracts:
- Procedure metadata (name, purpose, goals)
- Step definitions with titles and descriptions
- Decision points and branching logic
- Considerations for different phases

### 2. Automatic Object Generation

#### Equipment Objects
The system scans step descriptions for equipment-related keywords:
- `equipment`, `instrument`, `monitor`, `device`, `machine`, `tool`
- Medical devices: `stethoscope`, `thermometer`, `sphygmomanometer`, `probe`
- Surgical tools: `scalpel`, `forceps`, `clamp`, `catheter`, `syringe`

#### Material Objects  
Identifies materials and supplies:
- `material`, `supply`, `gauze`, `bandage`, `tape`, `antiseptic`
- Medical supplies: `medication`, `drug`, `solution`, `fluid`, `oxygen`

#### Environment Objects
Detects environmental elements:
- `room`, `environment`, `field`, `area`, `space`, `table`, `bed`
- Medical environments: `operating room`, `sterile field`, `workspace`

#### Standard Objects
Always includes:
- **Patient**: The primary person undergoing the procedure
- **Healthcare Provider**: The professional performing the procedure
- **Procedure Documentation**: Required documentation and records

### 3. Scenario Generation

#### Main Scenario
Creates a comprehensive scenario covering the entire procedure with:
- Name based on procedure name
- Description from procedure purpose
- Objectives derived from goals
- Estimated duration (3 minutes per step minimum)
- Difficulty level (intermediate by default)

#### Decision Training Scenarios
For complex decision points with multiple options:
- Focused training on specific decision-making
- Advanced difficulty level
- Shorter duration (15 minutes)
- Specific learning objectives

#### Emergency Scenarios
When emergency steps are detected:
- Specialized emergency response training
- Advanced difficulty
- Focus on rapid response and protocol adherence

### 4. Trigger Generation

#### Step Guidance Triggers
- **Step Start**: Shows instructions when each step begins
- **Step Completion**: Handles step advancement logic

#### Decision Point Triggers
- **User Choice**: Responds to user selections at decision points
- **Branching Logic**: Automatically routes to appropriate next steps
- **Feedback**: Provides immediate feedback on choices

#### Monitoring Triggers
- **Time Warnings**: Alerts when procedure exceeds expected duration
- **Error Handling**: Manages critical errors during simulation
- **Completion**: Celebrates successful procedure completion

#### System Triggers
- **Cooldown Management**: Prevents trigger spam
- **Activation Limits**: Controls maximum trigger executions
- **Priority Handling**: Manages trigger execution order

## Usage

### In the Enhanced Simulation Builder

1. **Automatic Detection**: When YAML content is available, a "Generate from YAML" button appears
2. **One-Click Generation**: Click the button to automatically create simulation elements
3. **Smart Merging**: New elements are merged with existing ones, avoiding duplicates
4. **Visual Feedback**: Success toast shows counts of generated elements

### YAML Structure Requirements

```yaml
procedure_name: "Your Procedure Name"
purpose: "Brief description of the procedure's purpose"

steps:
  - id: step_1
    title: "Step Title"
    description: "Detailed step description mentioning equipment and materials"
    next: step_2
  
  - id: step_2
    title: "Decision Point"
    description: "A step requiring a decision"
    decision_point: true
    options:
      - choice: "Option A"
        next: step_3
        condition: "When this condition applies"
      - choice: "Option B"
        next: step_4
        condition: "Alternative condition"

considerations:
  pre-operative:
    - "Preparation requirements"
  intra-operative:
    - "During procedure considerations"
  post-operative:
    - "Post-procedure requirements"

goals:
  - "Primary objective"
  - "Secondary objective"
```

## Generated Element Properties

### Objects
- **Unique IDs**: UUID-based identification
- **Realistic Properties**: Equipment calibration, material expiration, patient vitals
- **Interaction Types**: Context-appropriate interactions (setup, use, monitor, etc.)
- **Smart Tagging**: Automatic categorization based on content

### Scenarios
- **Linked Elements**: Automatic object and trigger associations
- **Difficulty Progression**: From beginner to advanced based on complexity
- **Comprehensive Outcomes**: Success, partial completion, and failure scenarios
- **Time Estimates**: Realistic duration calculations

### Triggers
- **Event-Driven**: Responds to step changes, user actions, and system states
- **Condition Logic**: Smart evaluation of simulation state
- **Action Chains**: Multiple actions per trigger (messages, audio, state changes)
- **Priority System**: Critical, high, medium, and low priority levels

## Testing

Visit `/test-yaml-generation` to:
- Test YAML parsing with sample data
- See generated objects, scenarios, and triggers
- Experiment with different YAML structures
- Validate generation logic

## Benefits

1. **Time Saving**: Automatic generation reduces manual setup time
2. **Consistency**: Standardized element creation across procedures
3. **Completeness**: Ensures all necessary simulation elements are included
4. **Intelligence**: Context-aware generation based on procedure content
5. **Flexibility**: Generated elements can be further customized manually

## Future Enhancements

- **Advanced NLP**: Better keyword extraction and context understanding
- **Custom Templates**: Procedure-type-specific generation templates
- **Learning Analytics**: Generate elements based on learning outcome data
- **Integration**: Connect with medical device databases for accurate specifications 