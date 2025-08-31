import { Button } from "@/components/ui/button";
import logoImage from "@assets/fulllogo_1756675026225.png";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-bg">
      <div className="app-container flex flex-col justify-center p-6 space-y-6">
        {/* Logo */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-lg">
          <img 
            src={logoImage} 
            alt="DineTogether Logo" 
            className="w-full h-auto"
          />
        </div>
        
        {/* Description and Features */}
        <div className="space-y-5">
          <p className="text-xl text-white/90 font-light leading-relaxed">
            Organize restaurant nights with friends. Create groups, plan dining events, and coordinate your culinary adventures.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-users text-sm"></i>
              </div>
              <span className="text-lg">Create dining groups</span>
            </div>
            
            <div className="flex items-center space-x-4 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-calendar text-sm"></i>
              </div>
              <span className="text-lg">Plan restaurant visits</span>
            </div>
            
            <div className="flex items-center space-x-4 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-comments text-sm"></i>
              </div>
              <span className="text-lg">Chat and coordinate</span>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="pt-4 w-full flex justify-center">
          <Button 
            className="bg-white text-purple-600 hover:bg-gray-100 font-semibold py-4 px-12 text-lg rounded-xl shadow-lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
