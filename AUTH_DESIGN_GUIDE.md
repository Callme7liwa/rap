# Authentication UI Design Guide

This document describes the design system used for the authentication pages.

## Design Philosophy

The login and registration pages follow the same design principles as the rest of the application:
- **Dark mode first** - Optimized for dark theme with light mode support
- **Indigo/Violet palette** - Primary colors: `#6366f1` (indigo) and `#8b5cf6` (violet)
- **Glass morphism** - Frosted glass effects with backdrop blur
- **Smooth animations** - Framer Motion entrance effects
- **Consistent typography** - Inter Tight for headings, Inter for body text

## Color System

### Primary Colors
```css
Primary: hsl(243, 75%, 59%)     /* #6366f1 - Indigo */
Accent:  hsl(258, 90%, 66%)     /* #8b5cf6 - Violet */
```

### Dark Mode
```css
Background: hsl(240, 6%, 6%)    /* Deep dark */
Card:       hsl(240, 6%, 10%)   /* Card background */
Foreground: hsl(240, 5%, 96%)   /* Text color */
Muted:      hsl(240, 5%, 64%)   /* Secondary text */
Border:     hsl(240, 4%, 16%)   /* Border color */
```

### Light Mode
```css
Background: hsl(240, 5%, 96%)   /* Light gray */
Card:       hsl(0, 0%, 100%)    /* White */
Foreground: hsl(240, 6%, 10%)   /* Dark text */
Muted:      hsl(240, 4%, 46%)   /* Secondary text */
Border:     hsl(240, 6%, 90%)   /* Border color */
```

## Button Styling

### Primary Button (Sign In / Sign Up)
- **Background**: Linear gradient from indigo to violet
- **Gradient**: `linear-gradient(135deg, #6366f1, #8b5cf6)`
- **Hover**: Slightly darker gradient with opacity change
- **Text**: White (`#ffffff`)
- **Border Radius**: `0.75rem` (12px)
- **Shadow**: Elevated shadow on hover

### Secondary Buttons (Links)
- **Background**: Transparent
- **Color**: Primary color (`#6366f1`)
- **Hover**: Reduced opacity

### Theme Toggle Button
- **Style**: Ghost variant with glass effect
- **Icon**: Sun (light mode) / Moon (dark mode)
- **Position**: Top right corner
- **Background**: Glass morphism effect

## Form Elements

### Input Fields
- **Background**: 
  - Light mode: White
  - Dark mode: Card background
- **Border**: Border color from theme
- **Focus**: 
  - 2px ring in primary color
  - Border changes to primary
- **Border Radius**: `0.5rem` (8px)
- **Transition**: 200ms ease

### Labels
- **Font**: Inter, 500 weight
- **Size**: `0.875rem` (14px)
- **Color**: Foreground color

### Error Messages
- **Background**: Destructive color with 10% opacity
- **Border**: Destructive color with 20% opacity
- **Text**: Destructive color
- **Border Radius**: `0.5rem`

## Layout Components

### Container Card
- **Effect**: Glass morphism
- **Background**: `backdrop-blur-xl bg-card/80`
- **Border**: `border border-border/50`
- **Shadow**: Elevated shadow
- **Border Radius**: `1rem` (16px)
- **Padding**: `2rem` (32px)
- **Max Width**: `28rem` (448px)

### Header Section
- **Logo**: Music icon with gradient text
- **Badge**: 
  - Primary color background with 10% opacity
  - Sparkles icon
  - Rounded full
- **Title**: Gradient text effect
- **Subtitle**: Muted foreground color

### Background
- **Gradient**: Hero gradient matching home page
- **Overlay**: Gradient from transparent to background
- **Opacity**: 30% for hero gradient

## Tabs (Sign In / Sign Up)

### Active Tab
- **Color**: Primary color
- **Border Bottom**: 2px primary color
- **Font Weight**: 600 (semibold)

### Inactive Tab
- **Color**: Muted foreground
- **Border Bottom**: 2px transparent
- **Hover**: Foreground color

## Typography

### Main Heading (h1)
- **Font**: Inter Tight
- **Size**: `2.25rem` (36px)
- **Weight**: 700 (bold)
- **Effect**: Gradient text clip

### Section Heading (h2)
- **Font**: Inter Tight
- **Size**: `1.5rem` (24px)
- **Weight**: 700 (bold)
- **Color**: Foreground

### Body Text
- **Font**: Inter
- **Size**: `0.875rem` (14px)
- **Weight**: 400 (regular)
- **Color**: Muted foreground

### Links
- **Color**: Primary
- **Hover**: Underline
- **Transition**: Color change

## Animations

### Page Entrance
- **Type**: Fade in + slide up
- **Duration**: 500ms
- **Easing**: Ease out
- **Initial**: `opacity: 0, y: 20`
- **Animate**: `opacity: 1, y: 0`

### Button Hover
- **Type**: Scale + shadow
- **Duration**: 200ms
- **Transform**: `scale(1.02)`
- **Shadow**: Elevated

### Input Focus
- **Type**: Ring expansion
- **Duration**: 200ms
- **Effect**: 2px ring with primary color

## Responsive Breakpoints

```css
Mobile:  < 640px   /* Full width container */
Tablet:  ≥ 640px   /* Max width 448px */
Desktop: ≥ 1024px  /* Centered with margin */
```

## Accessibility

- **Focus indicators**: Visible ring on all interactive elements
- **Color contrast**: WCAG AA compliant
- **Labels**: All inputs have associated labels
- **ARIA**: Proper ARIA attributes on form elements
- **Keyboard navigation**: Full keyboard support

## Implementation Details

### Theme Toggle Logic
```typescript
const [isDark, setIsDark] = useState(true);

useEffect(() => {
  const darkMode = document.documentElement.classList.contains('dark');
  setIsDark(darkMode);
}, []);

const toggleTheme = () => {
  setIsDark(!isDark);
  document.documentElement.classList.toggle('dark');
};
```

### Amplify Theme Configuration
Two separate themes are defined:
- `lightTheme`: For light mode
- `darkTheme`: For dark mode

The active theme is determined by the `isDark` state and passed to Amplify's ThemeProvider.

### CSS Custom Properties
Custom Amplify styling uses Tailwind's `@apply` directive in the components layer to ensure consistent styling across both themes.

## Social Authentication (Optional)

When enabled, social provider buttons:
- **Background**: Card background
- **Border**: Border color
- **Text**: Foreground color
- **Icons**: Provider-specific colors
- **Hover**: Muted background
- **Layout**: Full width, stacked vertically

## Best Practices

1. **Consistency**: All colors and spacing use design tokens
2. **Responsiveness**: Mobile-first approach
3. **Performance**: CSS-based animations, no heavy libraries
4. **Maintainability**: Centralized theme configuration
5. **Accessibility**: Focus on keyboard navigation and screen readers
6. **Dark Mode**: Default to dark, respect user preference
7. **Transitions**: Smooth 200ms transitions for micro-interactions

## Future Enhancements

Potential improvements:
- [ ] Password strength indicator with progress bar
- [ ] Loading states with skeleton screens
- [ ] Success/error toast notifications
- [ ] Email verification countdown timer
- [ ] Remember me checkbox with local storage
- [ ] Biometric authentication support
- [ ] Multi-factor authentication UI
- [ ] Account recovery flow UI
