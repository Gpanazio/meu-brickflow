# Fix User Settings Modal Bug

## Problem
1.  **UI Glitch**: The "Settings" modal appears "semi-invisible" or broken. This is caused by **nested modals**. `UserSettingsModal` renders a `Dialog`, which provides an overlay and container. But `UserSettingsModal` *also* renders its own overlay and container *inside* that `Dialog`. This duplication breaks the layout and opacity.
2.  **Password Prompt**: The browser is likely auto-filling or prompting for a password because it detects a password field in the new "Create User" form.

## Solution

### 1. Simplify `UserSettingsModal` Structure (`src/App.jsx`)
Remove the outer `div`s that duplicate the `Dialog` functionality.

**Current:**
```jsx
return (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <div className="fixed inset-0 z-50 ... bg-black/70 ...">  <-- DELETE
      <div className="relative z-50 ... glass-panel ...">     <-- DELETE (Dialog already has glass-panel)
         // ... Content
      </div>
    </div>
  </Dialog>
);
```

**Fixed:**
```jsx
return (
  <Dialog open={isOpen} onOpenChange={onClose}>
    {/* Content directly here */}
    <div className="p-6 border-b ...">...</div>
    <div className="p-6 ...">...</div>
    <div className="p-4 ...">...</div>
  </Dialog>
);
```

**Note**: I need to check if `Dialog` applies the `glass-panel` class.
`src/App.jsx` Line 96: `<div className="... glass-panel ...">`. Yes, it does.
So `UserSettingsModal` should NOT add another `glass-panel` wrapper.

### 2. Fix Z-Index (`src/App.jsx`)
The `Dialog` component uses `z-50`. The `LegacyHeader` also uses `z-50`. This causes conflicts.
I will bump `Dialog` z-index to `z-[60]`.

### 3. Fix Password Autocomplete (`src/App.jsx`)
Add `autoComplete="new-password"` to the password input in the "Gerenciar Equipe" form.

## Execution
I will apply these changes to `src/App.jsx`.
