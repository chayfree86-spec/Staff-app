export const getProfileGradientStyle = (id: string, staffList: any[]) => {
  const index = staffList.findIndex(s => s.id === id);
  const safeIndex = Math.max(0, index);
  
  // Golden angle distribution for maximum color variance
  const hue1 = Math.round(safeIndex * 137.5) % 360;
  const hue2 = (hue1 + 35) % 360;
  
  // High-contrast, dark/vibrant colors: Saturation 78-82%, Lightness 30-40%
  const color1 = `hsl(${hue1}, 78%, 40%)`;
  const color2 = `hsl(${hue2}, 82%, 30%)`;
  
  return {
    backgroundImage: `linear-gradient(135deg, ${color1}, ${color2})`,
  };
};
