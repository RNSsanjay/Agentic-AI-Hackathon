import asyncio
import logging
from django.core.management.base import BaseCommand, CommandError
from api.scrap import InternshipScraper

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Scrape internships from job websites and update the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sources',
            nargs='+',
            choices=['indeed', 'linkedin', 'naukri'],
            default=['indeed', 'linkedin', 'naukri'],
            help='Specify which sources to scrape from'
        )
        parser.add_argument(
            '--keyword',
            type=str,
            default='internship',
            help='Keyword to search for (default: internship)'
        )
        parser.add_argument(
            '--location',
            type=str,
            default='India',
            help='Location to search in (default: India)'
        )
        parser.add_argument(
            '--pages',
            type=int,
            default=2,
            help='Number of pages to scrape per source (default: 2)'
        )
        parser.add_argument(
            '--clean-expired',
            action='store_true',
            help='Clean expired internships before scraping'
        )

    def handle(self, *args, **options):
        scraper = InternshipScraper()
        
        # Clean expired internships if requested
        if options['clean_expired']:
            self.stdout.write('Cleaning expired internships...')
            try:
                existing_data = scraper.load_existing_internships()
                existing_internships = existing_data.get("internships", [])
                
                from datetime import datetime
                current_date = datetime.now()
                active_internships = []
                expired_count = 0
                
                for internship in existing_internships:
                    deadline_str = internship.get('application_deadline')
                    if deadline_str:
                        try:
                            deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
                            if deadline >= current_date:
                                active_internships.append(internship)
                            else:
                                expired_count += 1
                        except ValueError:
                            active_internships.append(internship)
                    else:
                        active_internships.append(internship)
                
                # Save cleaned data
                import json
                cleaned_data = {"internships": active_internships}
                with open(scraper.data_file_path, 'w', encoding='utf-8') as f:
                    json.dump(cleaned_data, f, indent=2, ensure_ascii=False)
                
                self.stdout.write(
                    self.style.SUCCESS(f'Removed {expired_count} expired internships')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Failed to clean expired internships: {e}')
                )
        
        # Start scraping
        sources = options['sources']
        keyword = options['keyword']
        location = options['location']
        max_pages = min(options['pages'], 5)  # Limit to 5 pages max
        
        self.stdout.write(f'Starting internship scraping...')
        self.stdout.write(f'Sources: {", ".join(sources)}')
        self.stdout.write(f'Keyword: {keyword}')
        self.stdout.write(f'Location: {location}')
        self.stdout.write(f'Pages per source: {max_pages}')
        
        try:
            # Run the scraping
            all_internships = asyncio.run(self._scrape_all(
                scraper, sources, keyword, location, max_pages
            ))
            
            # Save the results
            saved_count = scraper.save_internships(all_internships)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Scraping completed successfully!\n'
                    f'Scraped: {len(all_internships)} internships\n'
                    f'Saved: {saved_count} internships (after duplicate removal)'
                )
            )
            
        except Exception as e:
            logger.error(f"Scraping failed: {e}")
            raise CommandError(f'Scraping failed: {e}')

    async def _scrape_all(self, scraper, sources, keyword, location, max_pages):
        """Scrape from all specified sources"""
        all_internships = []
        
        if 'indeed' in sources:
            self.stdout.write('Scraping Indeed...')
            try:
                indeed_results = await scraper.scrape_indeed(keyword, location, max_pages)
                all_internships.extend(indeed_results)
                self.stdout.write(f'Indeed: {len(indeed_results)} internships found')
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Indeed scraping failed: {e}')
                )

        if 'linkedin' in sources:
            self.stdout.write('Scraping LinkedIn...')
            try:
                linkedin_results = await scraper.scrape_linkedin(keyword, location, max_pages)
                all_internships.extend(linkedin_results)
                self.stdout.write(f'LinkedIn: {len(linkedin_results)} internships found')
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'LinkedIn scraping failed: {e}')
                )

        if 'naukri' in sources:
            self.stdout.write('Scraping Naukri...')
            try:
                naukri_results = await scraper.scrape_naukri(keyword, location, max_pages)
                all_internships.extend(naukri_results)
                self.stdout.write(f'Naukri: {len(naukri_results)} internships found')
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Naukri scraping failed: {e}')
                )

        return all_internships
