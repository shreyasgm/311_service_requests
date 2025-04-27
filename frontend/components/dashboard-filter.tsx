"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, X, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import type { MapFilter } from "@/types"
import { getFilterOptions } from "@/lib/service-requests"
import { format } from "date-fns"

interface DashboardFilterProps {
  onFilterChange: (filter: MapFilter) => void
}

export function DashboardFilter({ onFilterChange }: DashboardFilterProps) {
  const [open, setOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    departments: [],
    requestTypes: [],
    priorities: [],
  })

  const [filter, setFilter] = useState<MapFilter>({
    status: [],
    department: [],
    requestType: [],
    priority: [],
    dateRange: [null, null],
  })

  useEffect(() => {
    async function loadFilterOptions() {
      const options = await getFilterOptions()
      setFilterOptions({
        statuses: options.statuses,
        departments: options.departments,
        requestTypes: options.requestTypes,
        priorities: options.priorities,
      })
    }

    loadFilterOptions()
  }, [])

  const handleFilterChange = (type: keyof MapFilter, value: string) => {
    setFilter((prev) => {
      const newFilter = { ...prev }

      if (type === "status" || type === "department" || type === "requestType" || type === "priority") {
        if (newFilter[type]?.includes(value)) {
          newFilter[type] = newFilter[type]?.filter((v) => v !== value)
        } else {
          newFilter[type] = [...(newFilter[type] || []), value]
        }
      }

      onFilterChange(newFilter)
      return newFilter
    })
  }

  const handleDateChange = (date: Date | null) => {
    setFilter((prev) => {
      const newFilter = { ...prev }
      const currentRange = newFilter.dateRange || [null, null]

      // If no date selected yet or both dates are selected, start a new range
      if (!currentRange[0] || (currentRange[0] && currentRange[1])) {
        newFilter.dateRange = [date, null]
      } else {
        // If start date is selected but not end date
        newFilter.dateRange = [currentRange[0], date]
      }

      onFilterChange(newFilter)
      return newFilter
    })
  }

  const clearFilters = () => {
    setFilter({
      status: [],
      department: [],
      requestType: [],
      priority: [],
      dateRange: [null, null],
    })
    onFilterChange({})
  }

  const getActiveFilterCount = () => {
    return (
      (filter.status?.length || 0) +
      (filter.department?.length || 0) +
      (filter.requestType?.length || 0) +
      (filter.priority?.length || 0) +
      (filter.dateRange && filter.dateRange[0] ? 1 : 0)
    )
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2 items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="border-dashed">
              <span>Filter</span>
              {getActiveFilterCount() > 0 && (
                <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">{getActiveFilterCount()}</Badge>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
              </CommandList>

              <CommandList>
                <CommandGroup heading="Status">
                  {filterOptions.statuses.map((status) => (
                    <CommandItem
                      key={status.id}
                      onSelect={() => handleFilterChange("status", status.name)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.status?.includes(status.name) ? "bg-primary text-primary-foreground" : "opacity-50",
                        )}
                      >
                        {filter.status?.includes(status.name) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{status.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>

              <CommandList>
                <CommandGroup heading="Department">
                  {filterOptions.departments.map((department) => (
                    <CommandItem
                      key={department.id}
                      onSelect={() => handleFilterChange("department", department.name)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.department?.includes(department.name)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50",
                        )}
                      >
                        {filter.department?.includes(department.name) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{department.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>

              <CommandList>
                <CommandGroup heading="Request Type">
                  {filterOptions.requestTypes.map((type) => (
                    <CommandItem
                      key={type.id}
                      onSelect={() => handleFilterChange("requestType", type.name)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.requestType?.includes(type.name) ? "bg-primary text-primary-foreground" : "opacity-50",
                        )}
                      >
                        {filter.requestType?.includes(type.name) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{type.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>

              <CommandList>
                <CommandGroup heading="Priority">
                  {filterOptions.priorities.map((priority) => (
                    <CommandItem
                      key={priority.id}
                      onSelect={() => handleFilterChange("priority", priority.name)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.priority?.includes(priority.name)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50",
                        )}
                      >
                        {filter.priority?.includes(priority.name) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{priority.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            {getActiveFilterCount() > 0 && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear filters
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="border-dashed">
              <Calendar className="mr-2 h-4 w-4" />
              <span>Date Range</span>
              {filter.dateRange && filter.dateRange[0] && (
                <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {filter.dateRange[0] && filter.dateRange[1]
                    ? `${format(filter.dateRange[0], "MMM d")} - ${format(filter.dateRange[1], "MMM d")}`
                    : filter.dateRange[0]
                      ? `From ${format(filter.dateRange[0], "MMM d")}`
                      : ""}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={{
                from: filter.dateRange?.[0] || undefined,
                to: filter.dateRange?.[1] || undefined,
              }}
              onSelect={(range) => {
                setFilter((prev) => {
                  const newFilter = { ...prev }
                  newFilter.dateRange = [range?.from || null, range?.to || null]
                  onFilterChange(newFilter)
                  return newFilter
                })
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Active filter badges */}
        <div className="flex flex-wrap gap-1">
          {filter.status?.map((status) => (
            <Badge key={status} variant="secondary" className="flex items-center gap-1">
              {status}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("status", status)} />
            </Badge>
          ))}

          {filter.department?.map((dept) => (
            <Badge key={dept} variant="secondary" className="flex items-center gap-1">
              {dept}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("department", dept)} />
            </Badge>
          ))}

          {filter.requestType?.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center gap-1">
              {type}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("requestType", type)} />
            </Badge>
          ))}

          {filter.priority?.map((priority) => (
            <Badge key={priority} variant="secondary" className="flex items-center gap-1">
              {priority}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("priority", priority)} />
            </Badge>
          ))}

          {filter.dateRange && filter.dateRange[0] && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {filter.dateRange[0] && filter.dateRange[1]
                ? `${format(filter.dateRange[0], "MMM d")} - ${format(filter.dateRange[1], "MMM d")}`
                : filter.dateRange[0]
                  ? `From ${format(filter.dateRange[0], "MMM d")}`
                  : ""}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setFilter((prev) => {
                    const newFilter = { ...prev }
                    newFilter.dateRange = [null, null]
                    onFilterChange(newFilter)
                    return newFilter
                  })
                }}
              />
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
