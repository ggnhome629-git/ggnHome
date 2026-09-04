import React, { useState } from 'react';
import { User, X, ChevronRight, Home, Key, Building, Users, TrendingUp, Lightbulb, FileText, HelpCircle, Smartphone, Search, Sparkles, Scale, Calculator, MapPin, DollarSign } from 'lucide-react';
const ad1 = process.env.PUBLIC_URL + "/Ad/ad1.jpg";
const ad2 = process.env.PUBLIC_URL + "/Ad/ad2.jpg";
const ad3 = process.env.PUBLIC_URL + "/Ad/ad3.jpg";
const ad4 = process.env.PUBLIC_URL + "/Ad/ad4.jpg";

export default function SideMenuBar({ currentUser, onLoginClick }) {
  const [isOpen, setIsOpen] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuSections = [{title: null, items: [{icon: User, label: currentUser ? currentUser.email : 'LOGIN / REGISTER', color: '#0066FF', special: true, onClick: !currentUser ? onLoginClick : undefined}]}, {title: 'Quick Actions', items: [{icon: Home, label: 'Post Property', color: '#00A79D', badge: 'FREE', onClick: () => { if(currentUser){ window.location.href = '/add-property'; } else { window.location.href = '/login'; } }}, {icon: Sparkles, label: 'AI Search', color: '#22D3EE', badge: 'NEW', link: '/AIassistant'}, {icon: Scale, label: 'Legal Laws', color: '#4A6A8A', onClick: () => {
    const el = document.getElementById('news');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }}]}, {title: 'Explore our Services', items: [
    {
      icon: Search,
      label: 'For Buyers',
      onClick: () => { window.location.href = '/'; }
    },
    {
      icon: Key,
      label: 'For Tenants',
      onClick: () => { window.location.href = '/'; }
    },
    {
      icon: Building,
      label: 'For Owners',
      onClick: () => { window.location.href = '/add-property'; }
    },
    {
      icon: Users,
      label: 'For Dealers / Builders'
    }
  ]}, {title: 'Tools & Resources', items: [{icon: Calculator, label: 'EMI Calculator', badge: 'Coming Soon'}, {icon: DollarSign, label: 'Home Loans', badge: 'Coming Soon'}, {icon: Lightbulb, label: 'Insights', badge: 'NEW'}, {icon: FileText, label: 'Articles & News', onClick: () => {
    const el = document.getElementById('news');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }}]}, {title: 'Support', items: [{icon: TrendingUp, label: 'About Us'}, {icon: HelpCircle, label: 'Get Help', onClick: () => { window.location.href = '/support'; }}]}];

  return (<div style={{display: 'flex', fontFamily: 'Arial, sans-serif'}}>
      {/* Sidebar */}
      <div style={{
        width: isOpen ? '340px' : '0',
        backgroundColor: '#FFFFFF',
        height: '100vh',
        position: 'fixed',
        left: '0',
        top: '0',
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: '1000'
      }}>
        {/* Header */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F4F7F9'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#4A6A8A', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><User size={22} color="#FFFFFF" /></div>
            <span
              style={{fontSize: '18px', fontWeight: '700', color: '#0066FF', cursor: !currentUser ? 'pointer' : 'default'}}
              onClick={!currentUser ? () => window.location.href = '/login' : undefined}
            >
              {currentUser ? currentUser.email : 'LOGIN / REGISTER'}
            </span>
          </div>
          <button onClick={() => setIsOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '8px'}}><X size={24} color="#4A6A8A" /></button>
        </div>

        

        

        {/* Post Property Button */}
        <div style={{ margin: '0 20px 20px' }}>
  <button
    style={{
      width: '100%',
      padding: '10px 24px',
      backgroundColor: '#0066FF',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      position: 'relative',
      zIndex: '1',
    }}
    onClick={() => {
      if (currentUser) {
        // Redirect to post property page if logged in
        window.location.href = '/add-property';
      } else {
        // Otherwise, redirect to login
        window.location.href = '/login';
      }
    }}
    onMouseEnter={(e) => {
      e.target.style.backgroundColor = '#0052CC';
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = '0 6px 20px rgba(0,102,255,0.3)';
    }}
    onMouseLeave={(e) => {
      e.target.style.backgroundColor = '#0066FF';
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = 'none';
    }}
  >
    Post Property
  </button>
</div>

        {/* Menu Items */}
       <div
  style={{
    flex: 1,
    overflowY: "auto",
    padding: "0 12px",
    minHeight: 0,
  }}
>
          {menuSections.map((section, secIdx) => (<div key={secIdx} style={{marginBottom: '24px'}}>
              {section.title && <h4 style={{fontSize: '13px', fontWeight: '600', color: '#4A6A8A', padding: '12px 12px 8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>{section.title}</h4>}
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const key = `${secIdx}-${itemIdx}`;
                const handleClick = () => {
                  if (item.onClick) {
                    item.onClick();
                  } else if (item.link) {
                    window.location.href = item.link;
                  }
                };
                return (<div key={key} onMouseEnter={() => setHoveredItem(key)} onMouseLeave={() => setHoveredItem(null)} onClick={handleClick} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px', margin: '4px 0', borderRadius: '10px', cursor: item.onClick || item.link ? 'pointer' : 'default', transition: 'all 0.3s ease', backgroundColor: hoveredItem === key ? '#F4F7F9' : 'transparent', transform: hoveredItem === key ? 'translateX(4px)' : 'translateX(0)', borderLeft: hoveredItem === key ? '3px solid #00A79D' : '3px solid transparent'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '36px', height: '6px', borderRadius: '8px', backgroundColor: item.special ? '#0066FF15' : item.color ? `${item.color}15` : '#4A6A8A15', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', transform: hoveredItem === key ? 'rotate(5deg) scale(1.1)' : 'rotate(0) scale(1)'}}><Icon size={20} color={item.special ? '#0066FF' : item.color || '#4A6A8A'} /></div>
                      <span style={{fontSize: '15px', fontWeight: item.special ? '700' : '500', color: item.special ? '#0066FF' : '#333333'}}>{item.label}</span>
                      {item.badge && <span style={{padding: '3px 8px', backgroundColor: item.badge === 'NEW' ? '#22D3EE' : '#00A79D', color: '#FFFFFF', borderRadius: '6px', fontSize: '10px', fontWeight: '700'}}>{item.badge}</span>}
                    </div>
                    <ChevronRight size={18} color="#4A6A8A" style={{opacity: hoveredItem === key ? '1' : '0.3', transition: 'all 0.3s', transform: hoveredItem === key ? 'translateX(4px)' : 'translateX(0)'}} />
                  </div>);
              })}
            </div>))}
        </div>

        {/* Footer */}
        <div style={{position: 'absolute', bottom: '0', left: '0', right: '0', padding: '20px', backgroundColor: '#F4F7F9', borderTop: '1px solid #E5E7EB'}}>
          {/* <div style={{padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '10px', marginBottom: '12px'}}>
            <input type="text" placeholder="Search by Property Code" style={{width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none'}} />
          </div> */}
          <div style={{fontSize: '13px', color: '#333333', textAlign: 'center', lineHeight: '1.6'}}>
            <strong>Toll Free Number: 9310994032.</strong><br/>
            {/* <span style={{color: '#4A6A8A'}}>For international numbers </span> */}
            {/* <a href="#" style={{color: '#0066FF', textDecoration: 'none', fontWeight: '600'}}>click here</a> */}
          </div>
        </div>
      </div>

      
      {/* Overlay */}
      {isOpen && (<div onClick={() => setIsOpen(false)} style={{position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '999', transition: 'opacity 0.3s'}} />)}
    </div>);
}