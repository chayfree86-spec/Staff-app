export const getProfileGradientStyle = (id: string, staffList: any[]) => {
  const gradients = [
    'linear-gradient(135deg, #1e3a8a, #0ea5e9)', // 1. Blue
    'linear-gradient(135deg, #3b0764, #6b21a8)', // 2. Purple
    'linear-gradient(135deg, #7f1d1d, #b91c1c)', // 3. Red
    'linear-gradient(135deg, #14532d, #166534)', // 4. Green
    'linear-gradient(135deg, #78350f, #b45309)', // 5. Bronze/Gold
    'linear-gradient(135deg, #002244, #0055a5)', // 6. Dark Blue
    'linear-gradient(135deg, #4c0519, #881337)', // 7. Wine/Plum
    'linear-gradient(135deg, #7c2d12, #c2410c)', // 8. Blood Orange
    'linear-gradient(135deg, #064e3b, #047857)', // 9. Forest Green
    'linear-gradient(135deg, #451a03, #7c2d12)', // 10. Coffee Brown
    'linear-gradient(135deg, #0d5c3a, #008080)', // 11. Ocean Teal
    'linear-gradient(135deg, #312e81, #4f46e5)', // 12. Indigo
    'linear-gradient(135deg, #9f1239, #e11d48)', // 13. Ruby Red
    'linear-gradient(135deg, #3f6212, #65a30d)', // 14. Lime Green
    'linear-gradient(135deg, #713f12, #ca8a04)', // 15. Dark Amber
    'linear-gradient(135deg, #0c4a6e, #0284c7)', // 16. Cyan Blue
    'linear-gradient(135deg, #581c87, #9333ea)', // 17. Orchid Violet
    'linear-gradient(135deg, #8c1d40, #d03b68)', // 18. Coral/Deep Pink
    'linear-gradient(135deg, #453303, #713f12)', // 19. Olive Bronze
    'linear-gradient(135deg, #3e2723, #5d4037)', // 20. Chocolate
    'linear-gradient(135deg, #115e59, #0d9488)', // 21. Deep Teal
    'linear-gradient(135deg, #4a0404, #701a75)', // 22. Amethyst
    'linear-gradient(135deg, #580505, #991b1b)', // 23. Dark Cherry
    'linear-gradient(135deg, #022c22, #0f766e)', // 24. Seaweed Green
    'linear-gradient(135deg, #1c1917, #44403c)', // 25. Charcoal
    'linear-gradient(135deg, #1e1b4b, #312e81)', // 26. Dark Denim
    'linear-gradient(135deg, #701a75, #a21caf)', // 27. Deep Magenta
    'linear-gradient(135deg, #831843, #be185d)', // 28. Hot Pink
    'linear-gradient(135deg, #0f4c3a, #10b981)', // 29. Mint Green
    'linear-gradient(135deg, #9a3412, #ea580c)', // 30. Rust Orange
    'linear-gradient(135deg, #2e1065, #5b21b6)', // 31. Grape
  ];

  const index = staffList.findIndex(s => s.id === id);
  const gradient = gradients[Math.max(0, index) % gradients.length];
  
  return {
    backgroundImage: gradient,
  };
};
