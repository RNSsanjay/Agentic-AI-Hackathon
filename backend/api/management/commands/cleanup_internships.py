import json
import os
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Clean up expired internships and maintain data quality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cleaned without actually doing it'
        )
        parser.add_argument(
            '--days-ahead',
            type=int,
            default=0,
            help='Also remove internships expiring within X days (default: 0)'
        )

    def handle(self, *args, **options):
        data_file_path = os.path.join(settings.BASE_DIR, 'data', 'internships.json')
        
        if not os.path.exists(data_file_path):
            self.stdout.write(
                self.style.WARNING('No internships data file found')
            )
            return
        
        try:
            # Load existing data
            with open(data_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            existing_internships = data.get("internships", [])
            self.stdout.write(f'Found {len(existing_internships)} internships')
            
            # Filter internships
            current_date = datetime.now()
            cutoff_date = current_date + timedelta(days=options['days_ahead'])
            
            active_internships = []
            expired_count = 0
            soon_to_expire_count = 0
            
            for internship in existing_internships:
                deadline_str = internship.get('application_deadline')
                
                if deadline_str:
                    try:
                        deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
                        
                        if deadline < current_date:
                            expired_count += 1
                            continue
                        elif deadline < cutoff_date:
                            soon_to_expire_count += 1
                            if options['days_ahead'] > 0:
                                continue
                        
                        active_internships.append(internship)
                    except ValueError:
                        # Keep internships with invalid date formats
                        active_internships.append(internship)
                else:
                    # Keep internships without deadlines
                    active_internships.append(internship)
            
            # Report what would be done
            self.stdout.write(f'Expired internships: {expired_count}')
            if options['days_ahead'] > 0:
                self.stdout.write(f'Expiring within {options["days_ahead"]} days: {soon_to_expire_count}')
            self.stdout.write(f'Active internships remaining: {len(active_internships)}')
            
            if options['dry_run']:
                self.stdout.write(
                    self.style.WARNING('DRY RUN - No changes made')
                )
                return
            
            # Save cleaned data
            cleaned_data = {"internships": active_internships}
            with open(data_file_path, 'w', encoding='utf-8') as f:
                json.dump(cleaned_data, f, indent=2, ensure_ascii=False)
            
            total_removed = expired_count + (soon_to_expire_count if options['days_ahead'] > 0 else 0)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Cleanup completed successfully!\n'
                    f'Removed: {total_removed} internships\n'
                    f'Remaining: {len(active_internships)} internships'
                )
            )
            
            # Additional cleanup statistics
            if active_internships:
                sources = {}
                domains = {}
                for internship in active_internships:
                    source = internship.get('source', 'Unknown')
                    sources[source] = sources.get(source, 0) + 1
                    
                    domain = internship.get('domain', 'Unknown')
                    domains[domain] = domains.get(domain, 0) + 1
                
                self.stdout.write('\nRemaining internships by source:')
                for source, count in sources.items():
                    self.stdout.write(f'  {source}: {count}')
                
                self.stdout.write('\nRemaining internships by domain:')
                for domain, count in sorted(domains.items(), key=lambda x: x[1], reverse=True)[:10]:
                    self.stdout.write(f'  {domain}: {count}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Cleanup failed: {e}')
            )
