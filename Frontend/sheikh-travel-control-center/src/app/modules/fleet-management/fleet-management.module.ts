import { NgModule } from '@angular/core';

import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';

import { FleetUiModule } from '../../shared/fleet-ui';

import { UiModule } from '../../shared/components/ui';



import { FleetLayoutComponent } from './fleet-layout/fleet-layout.component';

import { FleetDashboardComponent } from './fleet-dashboard/fleet-dashboard.component';

import { FleetDashboardContentComponent } from './fleet-dashboard/fleet-dashboard-content.component';

import { ComplianceDashboardComponent } from './compliance/compliance-dashboard/compliance-dashboard.component';

import { InspectionListComponent } from './inspections/inspection-list/inspection-list.component';

import { AssignmentBoardComponent } from './assignments/assignment-board/assignment-board.component';

import { FleetMaintenanceShellComponent } from './maintenance/fleet-maintenance-shell/fleet-maintenance-shell.component';

import { FleetMaintenanceDashboardComponent } from './maintenance/fleet-maintenance-dashboard/fleet-maintenance-dashboard.component';

import { MaintenanceRequestsComponent } from './maintenance/maintenance-requests/maintenance-requests.component';

import { MaintenanceSchedulesComponent } from './maintenance/maintenance-schedules/maintenance-schedules.component';

import { MaintenanceWorkOrdersComponent } from './maintenance/maintenance-work-orders/maintenance-work-orders.component';

import { FleetMaintenancePlaceholderComponent } from './maintenance/fleet-maintenance-placeholder/fleet-maintenance-placeholder.component';



const routes: Routes = [

  {

    path: '',

    component: FleetLayoutComponent,

    children: [

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      { path: 'dashboard', component: FleetDashboardComponent },

      { path: 'compliance', component: ComplianceDashboardComponent },

      { path: 'inspections', component: InspectionListComponent },

      { path: 'assignments', component: AssignmentBoardComponent },

      {

        path: 'maintenance',

        component: FleetMaintenanceShellComponent,

        children: [

          { path: '', component: FleetMaintenanceDashboardComponent },

          { path: 'requests', component: MaintenanceRequestsComponent },

          { path: 'schedules', component: MaintenanceSchedulesComponent },

          { path: 'work-orders', component: MaintenanceWorkOrdersComponent },

          { path: 'spare-parts', component: FleetMaintenancePlaceholderComponent },

          { path: 'vendors', component: FleetMaintenancePlaceholderComponent }

        ]

      }

    ]

  }

];



@NgModule({

  declarations: [

    FleetLayoutComponent,

    FleetDashboardComponent,

    ComplianceDashboardComponent,

    InspectionListComponent,

    AssignmentBoardComponent

  ],

  imports: [

    SharedModule,

    FleetUiModule,

    UiModule,

    FleetDashboardContentComponent,

    FleetMaintenanceShellComponent,

    FleetMaintenanceDashboardComponent,

    MaintenanceRequestsComponent,

    MaintenanceSchedulesComponent,

    MaintenanceWorkOrdersComponent,
    FleetMaintenancePlaceholderComponent,

    RouterModule.forChild(routes)

  ]

})

export class FleetManagementModule {}


