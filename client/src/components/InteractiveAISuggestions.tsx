import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AISparklesIcon } from '@/components/icons/AISparklesIcon';

interface PreferenceForm {
  foodType: string;
  priceRange: string;
  groupSize: number;
  occasion: string;
  ambiance: string;
  dietaryRestrictions: string[];
}

interface Recommendation {
  name: string;
  type: string;
  rating: number;
  priceRange: string;
  description: string;
  confidence: number;
  reasons: string[];
}

interface InteractiveAISuggestionsProps {
  title: string;
  subtitle: string;
  variant: 'user' | 'group';
  groupId?: string;
}

export function InteractiveAISuggestions({ 
  title, 
  subtitle, 
  variant, 
  groupId 
}: InteractiveAISuggestionsProps) {
  const [preferences, setPreferences] = useState<PreferenceForm>({
    foodType: '',
    priceRange: '',
    groupSize: 2,
    occasion: '',
    ambiance: '',
    dietaryRestrictions: []
  });
  
  const [showForm, setShowForm] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const generateMutation = useMutation({
    mutationFn: async (prefs: PreferenceForm) => {
      const endpoint = variant === 'group' && groupId 
        ? `/api/recommendations/group/${groupId}/custom`
        : '/api/recommendations/custom';
      
      const response = await apiRequest('POST', endpoint, prefs);
      return await response.json();
    },
    onSuccess: (data: any) => {
      setRecommendations(data.recommendations || []);
    }
  });

  const handleGenerateSuggestions = () => {
    generateMutation.mutate(preferences);
  };

  const resetForm = () => {
    setPreferences({
      foodType: '',
      priceRange: '',
      groupSize: 2,
      occasion: '',
      ambiance: '',
      dietaryRestrictions: []
    });
    setRecommendations([]);
    setShowForm(false);
  };

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
    'Keto', 'Paleo', 'Halal', 'Kosher'
  ];

  const toggleDietaryRestriction = (restriction: string) => {
    setPreferences(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
              <AISparklesIcon size={24} className="text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          
          {!showForm && !recommendations.length && (
            <Button 
              onClick={() => setShowForm(true)}
              className="gradient-bg"
              data-testid="button-start-suggestions"
            >
              <AISparklesIcon size={16} className="mr-2" />
              Get Suggestions
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {showForm && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Food Type */}
              <div className="space-y-2">
                <Label>Food Type</Label>
                <Select
                  value={preferences.foodType}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, foodType: value }))}
                >
                  <SelectTrigger data-testid="select-food-type">
                    <SelectValue placeholder="Select cuisine type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="italian">Italian</SelectItem>
                    <SelectItem value="chinese">Chinese</SelectItem>
                    <SelectItem value="mexican">Mexican</SelectItem>
                    <SelectItem value="japanese">Japanese</SelectItem>
                    <SelectItem value="indian">Indian</SelectItem>
                    <SelectItem value="american">American</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="thai">Thai</SelectItem>
                    <SelectItem value="mediterranean">Mediterranean</SelectItem>
                    <SelectItem value="korean">Korean</SelectItem>
                    <SelectItem value="vietnamese">Vietnamese</SelectItem>
                    <SelectItem value="any">Any Cuisine</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label>Price Range</Label>
                <Select
                  value={preferences.priceRange}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, priceRange: value }))}
                >
                  <SelectTrigger data-testid="select-price-range">
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget-Friendly ($)</SelectItem>
                    <SelectItem value="moderate">Moderate ($$)</SelectItem>
                    <SelectItem value="upscale">Upscale ($$$)</SelectItem>
                    <SelectItem value="fine-dining">Fine Dining ($$$$)</SelectItem>
                    <SelectItem value="any">Any Price Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Occasion */}
              <div className="space-y-2">
                <Label>Occasion</Label>
                <Select
                  value={preferences.occasion}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, occasion: value }))}
                >
                  <SelectTrigger data-testid="select-occasion">
                    <SelectValue placeholder="What's the occasion?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual Dining</SelectItem>
                    <SelectItem value="date">Date Night</SelectItem>
                    <SelectItem value="business">Business Meeting</SelectItem>
                    <SelectItem value="celebration">Celebration</SelectItem>
                    <SelectItem value="family">Family Gathering</SelectItem>
                    <SelectItem value="friends">Friends Hangout</SelectItem>
                    <SelectItem value="special">Special Occasion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ambiance */}
              <div className="space-y-2">
                <Label>Ambiance</Label>
                <Select
                  value={preferences.ambiance}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, ambiance: value }))}
                >
                  <SelectTrigger data-testid="select-ambiance">
                    <SelectValue placeholder="Preferred atmosphere" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cozy">Cozy & Intimate</SelectItem>
                    <SelectItem value="lively">Lively & Energetic</SelectItem>
                    <SelectItem value="quiet">Quiet & Peaceful</SelectItem>
                    <SelectItem value="trendy">Trendy & Modern</SelectItem>
                    <SelectItem value="traditional">Traditional & Classic</SelectItem>
                    <SelectItem value="outdoor">Outdoor Seating</SelectItem>
                    <SelectItem value="romantic">Romantic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group Size */}
            <div className="space-y-3">
              <Label>Group Size: {preferences.groupSize} people</Label>
              <Slider
                value={[preferences.groupSize]}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, groupSize: value[0] }))}
                max={20}
                min={1}
                step={1}
                className="w-full"
                data-testid="slider-group-size"
              />
            </div>

            {/* Dietary Restrictions */}
            <div className="space-y-3">
              <Label>Dietary Restrictions (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((option) => (
                  <Badge
                    key={option}
                    variant={preferences.dietaryRestrictions.includes(option) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDietaryRestriction(option)}
                    data-testid={`badge-dietary-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleGenerateSuggestions}
                disabled={generateMutation.isPending}
                className="flex-1 gradient-bg"
                data-testid="button-generate-suggestions"
              >
                {generateMutation.isPending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                ) : (
                  <AISparklesIcon size={16} className="mr-2" />
                )}
                Generate Suggestions
              </Button>
              <Button 
                variant="outline" 
                onClick={resetForm}
                data-testid="button-reset-form"
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {generateMutation.isPending && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-3 text-muted-foreground">
                <div className="animate-spin h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full"></div>
                <span className="font-medium">AI is analyzing your preferences...</span>
              </div>
            </div>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {/* Recommendations Results */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground">Your Personalized Recommendations</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowForm(true)}
                data-testid="button-modify-preferences"
              >
                <i className="fas fa-edit mr-2"></i>
                Modify Preferences
              </Button>
            </div>
            
            {recommendations.map((recommendation, index) => (
              <Card key={index} className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-medium text-foreground">{recommendation.name}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{recommendation.type}</Badge>
                        <Badge variant="outline">{recommendation.priceRange}</Badge>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <i
                              key={i}
                              className={`fas fa-star text-xs ${
                                i < Math.floor(recommendation.rating)
                                  ? 'text-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-muted-foreground ml-1">
                            {recommendation.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-purple-600">
                        {Math.round(recommendation.confidence * 100)}% match
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {recommendation.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {recommendation.reasons.map((reason, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => setShowForm(true)}
                variant="outline"
                className="flex-1"
                data-testid="button-try-different"
              >
                Try Different Preferences
              </Button>
              <Button 
                onClick={resetForm}
                variant="ghost"
                className="flex-1"
                data-testid="button-start-over"
              >
                Start Over
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {generateMutation.isError && (
          <div className="text-center py-4">
            <div className="text-red-500 mb-2">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Something went wrong generating suggestions
            </div>
            <Button 
              onClick={() => generateMutation.reset()}
              variant="outline"
              size="sm"
              data-testid="button-retry"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}