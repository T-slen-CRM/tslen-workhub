import {Injectable} from '@angular/core';
import {environment} from '../../../../../environments/environment';

export interface NavigationItem {
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  classes?: string;
  exactMatch?: boolean;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  function?: any;
  badge?: {
    title?: string;
    type?: string;
  };
  children?: Navigation[];
  admin?: boolean;
  useCustomTemplate?: boolean;
  customTemplateHeader?: any;
  customTemplateRoute?: any;
}

export interface Navigation extends NavigationItem {
  children?: NavigationItem[];
}

const NavigationItems = [
  {
    id: 'navigation',
    title: 'navigation.name',
    type: 'group',
    icon: 'feather icon-monitor',
    children: [
      {
        id: 'main-wall',
        title: 'navigation.main_wall',
        type: 'item',
        url: '/pages/main-wall',
        icon: 'feather icon-layout'
      },
      {
        id: 'personal-schedule',
        title: 'navigation.personal_schedule',
        type: 'item',
        url: '/pages/personal-schedule',
        icon: 'feather icon-user'
      },
      {
        id: 'common-schedule',
        title: 'navigation.company_calendar',
        type: 'item',
        url: '/pages/common-schedule',
        icon: 'feather icon-calendar'
      },
      {
        id: 'tasks-manager',
        title: 'navigation.tasks_manager',
        type: 'item',
        url: '/pages/tasks-manager',
        icon: 'feather icon-target'
      },
      {
        id: 'tasks-list',
        title: 'navigation.task_list',
        type: 'item',
        url: '/pages/tasks-list/:id',
        icon: 'feather icon-target',
        hidden: true,
        useCustomTemplate: true,
        customTemplateRoute: [
          {
            title: 'Tasks manager',
            type: 'item',
            url: '/pages/tasks-manager',
            breadcrumbs: true
          },
        ],
        customTemplateHeader: 'Task list 2222'
      },
      {
        id: 'manage-users',
        title: 'navigation.people',
        type: 'item',
        url: '/pages/manage-users',
        icon: 'feather icon-users'
      },
        {
        id: 'tslen-meet',
        title: 'navigation.tslen_meet',
        type: 'item',
        // external: true,
        // target: true,
        url: '/pages/live-kit',
        icon: 'feather icon-video'
      },
      {
        id: 'google-meet',
        title: 'navigation.meet',
        type: 'item',
        url: '/pages/meet',
        icon: 'feather icon-globe'
      },
      // {
      //   id: 'live-kit',
      //   title: 'LiveKit',
      //   type: 'item',
      //   url: '/pages/live-kit',
      //   icon: 'feather icon-video'
      // },
      {
        id: 'ip-checker',
        title: 'navigation.ip_checker',
        type: 'item',
        external: true,
        target: true,
        url: environment.ipCheckerUrl,
        icon: 'fa-solid fa-location-dot'
      }
    ]
  },
  {
    id: 'admin',
    title: 'navigation.admin',
    type: 'group',
    icon: 'feather icon-monitor',
    admin: true,
    manager: true,
    children: [
      {
        id: 'pending',
        title: 'navigation.pending',
        type: 'item',
        url: 'admin/pending',
        icon: 'feather icon-check-square',
        badge: {
          title: ''
        }
      },
      // {
      //   id: 'manage-users',
      //   title: 'Manage users',
      //   type: 'item',
      //   url: 'admin/manage-users',
      //   icon: 'feather icon-users'
      // },
      {
        id: 'company-rules',
        title: 'navigation.company_rules',
        type: 'item',
        url: '/admin/company-rules',
        icon: 'feather icon-file-text'
      },
      {
        id: 'inventory',
        title: 'Inventory',
        type: 'item',
        url: '/admin/inventory',
        icon: 'feather icon-monitor'
      },
      {
        id: 'inventory-create',
        title: 'Create inventory',
        type: 'item',
        url: '/admin/inventory-create',
        icon: 'feather icon-monitor',
        hidden: true,
        useCustomTemplate: true,
        customTemplateRoute: [
          {
            title: 'Inventory',
            type: 'item',
            url: '/admin/inventory',
            breadcrumbs: true
          },
        ],
      },
      {
        id: 'inventory-update',
        title: 'Update inventory',
        type: 'item',
        url: '/admin/inventory-update/:id',
        hidden: true,
        useCustomTemplate: true,
        customTemplateRoute: [
          {
            title: 'Inventory',
            type: 'item',
            url: '/admin/inventory',
            breadcrumbs: true
          },
        ],
      }
    ]
  },
  {
    id: 'audit-log-group',
    title: 'Audit Log',
    type: 'group',
    icon: 'feather icon-monitor',
    admin: true,
    children: [
      {
        id: 'audit-log',
        title: 'Audit Log',
        type: 'item',
        url: '/admin/audit-log',
        icon: 'feather icon-list'
      }
    ]
  },

];

@Injectable()
export class NavigationItem {
  public get() {
    return NavigationItems;
  }
}
