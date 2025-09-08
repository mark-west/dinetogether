import { Button } from "@/components/ui/button";
import logoImage from "@assets/fulllogo_1757366411712.png";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center space-y-8 text-center">
        {/* Logo */}
        <div className="w-full bg-white rounded-2xl p-6 shadow-xl">
          <img 
            src={logoImage} 
            alt="Dine Together Logo" 
            className="w-full h-auto rounded-lg"
          />
        </div>
        
        {/* Title & Description */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-white">
            DineTogether
          </h1>
          <p className="text-lg text-white/90 font-light leading-relaxed">
            Organize restaurant nights with friends. Create groups, plan dining events, and coordinate your culinary adventures.
          </p>
        </div>
        
        {/* Features */}
        <div className="w-full flex justify-center">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-users text-sm"></i>
              </div>
              <span className="text-base font-medium">Create dining groups</span>
            </div>
            
            <div className="flex items-center space-x-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-calendar text-sm"></i>
              </div>
              <span className="text-base font-medium">Plan restaurant visits</span>
            </div>
            
            <div className="flex items-center space-x-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-comments text-sm"></i>
              </div>
              <span className="text-base font-medium">Chat and coordinate</span>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="w-full pt-2">
          <Button 
            className="bg-white text-purple-600 hover:bg-gray-100 font-bold py-4 px-6 text-lg rounded-xl shadow-lg w-full"
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
