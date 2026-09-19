import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, Package, ArrowDownCircle, User } from 'lucide-react';

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/packages', icon: ShoppingBag, label: 'Invest' },
  { to: '/my-products', icon: Package, label: 'Products' },
  { to: '/withdraw', icon: ArrowDownCircle, label: 'Withdraw' },
  { to: '/mine', icon: User, label: 'Mine' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-lg mx-auto flex items-center">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'fill-accent/20' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
