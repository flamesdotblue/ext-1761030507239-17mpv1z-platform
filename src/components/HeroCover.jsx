import Spline from '@splinetool/react-spline';

export default function HeroCover() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Spline
        scene="https://prod.spline.design/MscgRj2doJR2RRa2/scene.splinecode"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/80 via-white/50 to-white/80" />
    </div>
  );
}
