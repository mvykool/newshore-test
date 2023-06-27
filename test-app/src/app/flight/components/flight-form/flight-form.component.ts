import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { FlightService } from '../../services/flight.service';
import { Flight } from '../../models/flight.model';

@Component({
  selector: 'app-flight-form',
  templateUrl: './flight-form.component.html',
  styleUrls: ['./flight-form.component.css']
})
export class FlightFormComponent implements OnInit {
  flightForm: FormGroup = this.formBuilder.group({
    tripType: ['oneWay'],
    origin: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    destination: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    intermediaryDestinations: this.formBuilder.array([])
  });

  constructor(private formBuilder: FormBuilder, private flightService: FlightService) { }

  ngOnInit(): void {}

  get getIntermediaryDestinations(): FormArray {
    return this.flightForm.get('intermediaryDestinations') as FormArray;
  }

  addIntermediaryDestination(): void {
    if (this.getIntermediaryDestinations.controls.length < 4) {
      const previousDestination = this.flightForm.value.destination;
  
      this.getIntermediaryDestinations.push(this.formBuilder.group({
        newOrigin: [{ value: previousDestination, disabled: true }],
        newDestination: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]]
      }));
  
      // Update the 'destination' control with the new destination from the last intermediary destination
      this.flightForm.get('destination')?.setValue(previousDestination);
    }
  }
  
  removeIntermediaryDestination(index: number): void {
    const intermediaryDestinations = this.getIntermediaryDestinations.controls;
    
    if (intermediaryDestinations[index]) {
      const removedDestination = intermediaryDestinations[index].get('newDestination')?.value;
      this.getIntermediaryDestinations.removeAt(index);
      
      // If we're removing the last intermediary destination, update the 'destination' control with its destination
      if (index === intermediaryDestinations.length - 1) {
        this.flightForm.get('destination')?.setValue(removedDestination);
      }
    }
  }

  onSubmit(): void {
    if (this.flightForm.valid) {
      const origin = this.flightForm.value.origin;
      const destination = this.flightForm.value.destination;
      const intermediaryDestinations = this.flightForm.get('intermediaryDestinations')?.value || [];
  
      let currentOrigin = origin;
      const totalRoute: { origin: string; destination: string; flights: Flight[]; }[] = [];
  
      // Add all intermediary destinations to our list, with the final destination last
      const allDestinations = [...intermediaryDestinations.map((id: { destination: any; }) => id.destination), destination];
  
      this.flightService.getFlights().subscribe({
        next: (flights: Flight[]) => {
          for (const currentDestination of allDestinations) {
            const routeSegment = this.findRoute(currentOrigin, currentDestination, flights, []);
            if (routeSegment) {
              totalRoute.push(routeSegment);
              currentOrigin = currentDestination; // The current destination becomes the new origin for the next segment
            } else {
              console.log('Route segment not found from', currentOrigin, 'to', currentDestination);
              break;
            }
          }
  
          if (totalRoute.length === allDestinations.length) {
            console.log('Complete route found:', totalRoute);
          } else {
            console.log('Complete route not found');
          }
        },
        error: (error: any) => {
          console.error('Error fetching flights:', error);
        },
      });
    }
  }
  
findRoute(current: string, destination: string, flights: Flight[], route: Flight[]): { origin: string, destination: string, flights: Flight[] } | null {
  const departingFlights = flights.filter(flight => flight.departureStation === current);

  for (const flight of departingFlights) {
    if (flight.arrivalStation === destination) {
      return { origin: current, destination: destination, flights: [...route, flight] };
    } else if (!route.find(r => r.departureStation === flight.arrivalStation)) {
      const newRoute = this.findRoute(flight.arrivalStation, destination, flights, [...route, flight]);
      if (newRoute) {
        return newRoute;
      }
    }
  }

  return null;
}

}