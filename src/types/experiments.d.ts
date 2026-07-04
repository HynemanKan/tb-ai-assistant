/**
 * Type declarations for Thunderbird experimental calendar API
 */

declare namespace browser.calendar {
  // calendar.calendars namespace
  namespace calendars {
    interface Calendar {
      id: string;
      cacheId?: string;
      type: string;
      name: string;
      url: string;
      readOnly: boolean;
      enabled: boolean;
      visible: boolean;
      showReminders: boolean;
      color?: string;
      capabilities?: CalendarCapabilities;
    }

    interface CalendarChangeProps {
      name?: string;
      url?: string;
      readOnly?: boolean;
      enabled?: boolean;
      visible?: boolean;
      showReminders?: boolean;
      color?: string;
    }

    interface CalendarCapabilities {
      timezones?: {
        floating?: boolean;
        UTC?: boolean;
      };
      organizer?: string;
      organizerName?: string;
      attachments?: boolean;
      priority?: boolean;
      privacy?: boolean | string[];
      categories?: {
        count?: number;
      };
      alarms?: {
        count?: number;
        actions?: string[];
      };
      tasks?: boolean;
      events?: boolean;
      removeModes?: Array<"unsubscribe" | "delete">;
      requiresNetwork?: boolean;
      minimumRefreshInterval?: number;
      mutable?: boolean;
      scheduling?: "client" | "server" | "none";
    }

    interface QueryInfo {
      type?: string;
      url?: string | string[];
      name?: string;
      color?: string;
      readOnly?: boolean;
      visible?: boolean;
      enabled?: boolean;
    }

    interface CreateProperties {
      name: string;
      type: string;
      url: string;
      readOnly?: boolean;
      enabled?: boolean;
      visible?: boolean;
      showReminders?: boolean;
      color?: string;
      capabilities?: object;
    }

    interface UpdateProperties {
      name?: string;
      url?: string;
      readOnly?: boolean;
      enabled?: boolean;
      color?: string;
      lastError?: string;
      capabilities?: object;
    }

    function query(queryInfo: QueryInfo): Promise<Calendar[]>;
    function get(id: string): Promise<Calendar>;
    function create(createProperties: CreateProperties): Promise<Calendar>;
    function update(id: string, updateProperties: UpdateProperties): Promise<Calendar>;
    function remove(id: string): Promise<void>;
    function clear(id: string): Promise<void>;
    function synchronize(ids?: string | string[]): Promise<void>;

    const onCreated: WebExtEvent<(calendar: Calendar) => void>;
    const onUpdated: WebExtEvent<(calendar: Calendar, changeInfo: CalendarChangeProps) => void>;
    const onRemoved: WebExtEvent<(id: string) => void>;
  }

  // calendar.items namespace
  namespace items {
    type CalendarItemFormats = "ical" | "jcal";
    type ReturnFormat = CalendarItemFormats | CalendarItemFormats[];

    interface CalendarItem {
      id: string;
      calendarId: string;
      type: "event" | "task";
      instance?: string;
      format?: CalendarItemFormats;
      item: any;
      metadata?: Record<string, any>;
    }

    interface CalendarItemAlarm {
      itemId: string;
      action: string;
      date: string;
      offset: string;
      related: "absolute" | "start" | "end";
    }

    interface GetOptions {
      returnFormat?: ReturnFormat;
    }

    interface QueryOptions {
      returnFormat?: ReturnFormat;
      id?: string;
      calendarId?: string | string[];
      type?: "event" | "task";
      rangeStart?: string;
      rangeEnd?: string;
      expand?: boolean;
    }

    interface CreateProperties {
      id?: string;
      type: "event" | "task";
      format?: CalendarItemFormats;
      item: any;
      returnFormat?: ReturnFormat;
      metadata?: Record<string, any>;
    }

    interface UpdateProperties {
      format?: CalendarItemFormats;
      item: any;
      returnFormat?: ReturnFormat;
      metadata?: Record<string, any>;
    }

    function get(calendarId: string, id: string, getOptions?: GetOptions): Promise<CalendarItem>;
    function query(queryOptions: QueryOptions): Promise<CalendarItem[]>;
    function create(calendarId: string, createProperties: CreateProperties): Promise<CalendarItem>;
    function update(calendarId: string, id: string, updateProperties: UpdateProperties): Promise<CalendarItem>;
    function move(fromCalendarId: string, id: string, toCalendarId: string): Promise<void>;
    function remove(calendarId: string, id: string): Promise<void>;
    function getCurrent(getOptions?: GetOptions): Promise<CalendarItem>;

    const onCreated: WebExtEvent<(item: CalendarItem, options?: { returnFormat?: ReturnFormat }) => void>;
    const onUpdated: WebExtEvent<(item: CalendarItem, changeInfo: object, options?: { returnFormat?: ReturnFormat }) => void>;
    const onRemoved: WebExtEvent<(calendarId: string, id: string) => void>;
    const onAlarm: WebExtEvent<(item: CalendarItem, alarm: CalendarItemAlarm, options?: { returnFormat?: ReturnFormat }) => void>;
  }

  // calendar.timezones namespace
  namespace timezones {
    const currentZone: string;
    const timezoneIds: string[];

    function getDefinition(tzid: string, returnFormat?: items.CalendarItemFormats): Promise<string>;

    const onUpdated: WebExtEvent<(tzid: string) => void>;
  }

  // calendar.provider namespace
  namespace provider {
    type ItemErrorType = "GENERAL_FAILURE" | "READ_FAILED" | "MODIFY_FAILED" | "CONFLICT";

    interface ItemError {
      error: ItemErrorType;
    }

    interface ItemOperationOptions {
      invitation?: boolean;
      offline?: boolean;
      force?: boolean;
    }

    interface FreeBusyOptions {
      addressee: string;
      start: string;
      end: string;
      types: Array<"free" | "busy" | "unavailable" | "tentative">;
    }

    function setAdvanceAction(options: {
      forward?: string;
      back?: string;
      label?: string;
      canForward?: boolean;
    }): Promise<void>;

    const onItemCreated: WebExtEvent<(calendar: calendars.Calendar, item: items.CalendarItem, options: ItemOperationOptions) => items.CalendarItem | ItemError>;
    const onItemUpdated: WebExtEvent<(calendar: calendars.Calendar, item: items.CalendarItem, oldItem: items.CalendarItem, options: ItemOperationOptions) => items.CalendarItem | ItemError>;
    const onItemRemoved: WebExtEvent<(calendar: calendars.Calendar, item: items.CalendarItem, options: ItemOperationOptions) => ItemError | undefined>;
    const onInit: WebExtEvent<(calendar: calendars.Calendar) => void>;
    const onSync: WebExtEvent<(calendar: calendars.Calendar) => void>;
    const onResetSync: WebExtEvent<(calendar: calendars.Calendar) => void>;
    const onFreeBusy: WebExtEvent<(options: FreeBusyOptions) => void>;
    const onDetectCalendars: WebExtEvent<(username: string, password: string, location: string, savePassword: boolean, extraProperties: object) => void>;
    const onAdvanceNewCalendar: WebExtEvent<(id: string) => void>;
  }
}
