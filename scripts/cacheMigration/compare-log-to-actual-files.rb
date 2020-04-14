# coding: utf-8
# Given log_cacheCalls.txt, compare the output against the data.


require 'json'


ROOTDIR = File.join(__dir__, '..', '..')


##################################
# Utils

# The cacheCalls file isn't actually valid json: we have to strip off
# a final comma, and put everything in [ ].
# Totally lazy hack.
def get_cache_hits()
  raw_content = File.read(File.join(ROOTDIR, 'log_cacheCalls.txt'))
  actual = "[ #{raw_content} ]".gsub(",\n ]", "\n]")
  all = JSON.parse(actual)

  bad_records = all.select { |hsh| hsh['scraperPath'].nil? }
  raise "Bad records missing scraperPath" if (bad_records.size > 0)

  puts "Have #{all.size} records, including cache misses"
  ret =
    all.
      select { |h| h['cacheFileExists'] == true }.
      select { |h| h['cacheFilePath'] =~ /coronadatascraper-cache/ }
  puts "Have #{ret.size} records, only cache hits"
  return ret
end


## CLEANUP UTILS

def delete_bad_json_files(unused_files)
  json = unused_files.select { |f| f =~ /json$/ }

  data = json.map do |f|
    content = File.read(File.join(ROOTDIR, f))
    stripContent = content.split("\n").map { |s| s.strip }.join("").gsub(' ', '')
    errMatch =
      (stripContent =~ /{"error":{"code":(499|403|400)/) ||
      (stripContent =~ /404: Not Found/)

    {
      filename: f,
      content: content,
      length: content.size,
      is_error: !errMatch.nil?
    }
  end

  data.sort! { |a, b| a[:length] <=> b[:length] }

  bad_json = data.select { |d| d[:is_error] }
  puts "# DELETE ERROR JSON FILES:"
  bad_json.each do |d|
    puts "git rm #{d[:filename]}"
  end
end


def delete_txt_files(unused_files)
  txt = unused_files.select { |f| f =~ /txt$/ }
  puts "# DELETE .txt FILES:"
  txt.each do |f|
    puts "git rm #{f}"
  end
end


def delete_bad_html_files(unused_files)
  html = unused_files.select { |f| f =~ /html$/ }

  data = html.map do |f|
    content = File.read(File.join(ROOTDIR, f))
    stripContent = content.split("\n").map { |s| s.strip }.join("").gsub(' ', '')
    errMatch =
      (stripContent =~ /Objectmoved/i) ||
      (stripContent =~ /DocumentMoved/i) ||
      (stripContent =~ /301MovedPermanently/i) ||
      (stripContent =~ /404: Not Found/)

    {
      filename: f,
      content: stripContent,
      length: stripContent.size,
      is_error: !errMatch.nil?
    }
  end

  data = data.sort { |a, b| a[:length] <=> b[:length] }

  # data.each do |d|
  #   puts '-' * 40
  #   puts d[:filename]
  #   puts d[:length]
  #   puts d[:content][0..100]
  # end
  
  bad_html = data.select { |d| d[:is_error] }
  puts "# DELETE BAD HTML FILES:"
  bad_html.each do |d|
    puts "git rm #{d[:filename]}"
  end
end


def delete_bad_csv_files(unused_files)
  files = unused_files.select { |f| f =~ /csv$/ }

  data = files.map do |f|
    content = File.read(File.join(ROOTDIR, f))
    stripContent = content.split("\n").map { |s| s.strip }.join("").gsub(' ', '')
    errMatch =
      (stripContent =~ /404:NotFound/i) ||
      (stripContent =~ /DocumentMoved/i) ||
      (stripContent =~ /"status":"Failed"/i) ||
      (stripContent =~ /"status":"queued","generating":{"csv":"queued"}/)

    {
      filename: f,
      content: content,
      length: content.size,
      is_error: !errMatch.nil?
    }
  end

  data = data.sort { |a, b| a[:length] <=> b[:length] }

  #  data.each do |d|
  #    puts '-' * 40
  #    puts d[:filename]
  #    puts d[:length]
  #    puts d[:content][0..100]
  #  end
  
  bad_files = data.select { |d| d[:is_error] }
  puts "# DELETE BAD CSV FILES:"
  bad_files.each do |d|
    puts "git rm #{d[:filename]}"
  end
end


#########################################################3
# Analysis

cache_hits = get_cache_hits()
# puts cache_hits[0].inspect

files_hit = cache_hits.map { |h| h['cacheFilePath'] }.uniq.sort
# puts files_hit.select { |f| f.include?("3636e44f67113049a0a53c378bef5a88") }
# return

cachedir = File.join(__dir__, '..', '..', 'coronadatascraper-cache')
files = []
Dir.chdir(cachedir) do
  files = Dir.glob(File.join('**', '*.*'))
end
all_files =
  files.
    map { |f| File.join("coronadatascraper-cache", f) }.
    uniq.
    sort

unused_files = all_files - files_hit

# Tracking down a troublesome commit:
# puts all_files.select { |f| f.include?("3636e44f67113049a0a53c378bef5a88") }
# puts "Hits:"
# puts files_hit.select { |f| f.include?("3636e44f67113049a0a53c378bef5a88") }
# return
# puts "Unused:"
# puts unused_files.select { |f| f.include?("3636e44f67113049a0a53c378bef5a88") }
# return

puts "The following #{unused_files.size} files were NOT INCLUDED in log_cacheCalls.txt"
puts unused_files.map { |f| f.gsub(/coronadatascraper-cache\./, '') }
puts "End #{unused_files.size} files not included in log_cacheCalls.txt"

puts
puts "Same file name occurring more than once in unused files:"
fnames = unused_files.map { |f| f.split('/')[-1] }
counts = Hash.new(0)
fnames.each { |f| counts[f] += 1 }
counts = counts.to_a.select { |f, c| c > 1 }.sort { |a, b| a[1] <=> b[1] }.reverse
counts.each { |f, c| puts "#{'%02d' % c}: #{'% 38s' % f} (e.g. #{unused_files.map { |f| f.gsub(/coronadatascraper-cache\//, '') }.select{ |s| s =~ /#{f}/ }[0] })" }
puts


report = [
  "total files in cache:                           #{files.size}",
  "can be migrated:                                #{cache_hits.size}",
  "still unknown, unused during cache-only scrape:  #{unused_files.size}"
]
puts
report.each { |s| puts "  #{s}" }

################################################
# CACHE CLEANUP

puts "\n\n"
puts "=" * 55
puts "SUGGESTED CACHE CLEANUP:"
puts "# #{unused_files.size} unused"
delete_bad_json_files(unused_files)
delete_txt_files(unused_files)
delete_bad_html_files(unused_files)
delete_bad_csv_files(unused_files)


############################################
# Scrapers that have multiple calls
#
# For each date, get the count of coronadatascraper-cache file path
# hits, per scraperPath.

puts "\n\n"
puts "=" * 55
puts "SCRAPERS WITH MULTIPLE CALLS:"

cache_hits = get_cache_hits()

# For some scrapers which use ArcGIS, we actually have too many cache
# hits.  For example, NJ uses an ArcGIS method (which in turn calls
# another ArcGIS method) to determine its final URL to call.  This
# means that there are 3 calls for just one source.  As a result, we
# can discard some of the cache hits
port_cache_hits = cache_hits.select do |h|
  u = h['requestedUrl']
  (u !~ /maps\.arcgis\.com/) && (u !~ /services.*?\.arcgis\.com/)
end

puts "#{cache_hits.size} cache hits, but after removing ArcGIS it's #{port_cache_hits.size}"


# All right, crazy code:
date_scraper_hash = Hash.new do |hash, key|
  hash[key] = Hash.new { |ih, ik| ih[ik] = [] }
end
# This lets us access and immediately push values:
# > date_scraper_hash[1]['c'] << 'h'
# => date_scraper_hash = {1=>{"c"=>["h"]}}

port_cache_hits.each do |h|
  d = h['date']
  s = h['scraperPath']

  # Some scrapers use ArcGIS, which results in multiple calls being
  # made to determine the final URL.
  date_scraper_hash[d][s] << h['requestedUrl']
end

# puts date_scraper_hash.inspect
multiple_hits = []
date_scraper_hash.each_pair do |dt, path_and_sources|
  path_and_sources.each_pair do |path, sources|
    multiple_hits << [dt, path, sources] if (sources.size > 1)
  end
end
# puts multiple_hits

puts "Scrapers with multiple calls:"
sc_with_mult =
  multiple_hits.
    map { |d, p, s| p }.
    map { |s| s.gsub(/.*scrapers\//, '') }.
    sort.
    uniq
puts sc_with_mult
puts "(#{sc_with_mult.size} scrapers)"

puts "\nThese scrapers, and their calls by date:"
sc_with_mult.each do |sc|
  calls = multiple_hits.select { |d, p, s| p =~ /#{sc}/ }
  calls.each do |d, p, s|
    puts d
    if (s.size > 3) then
      puts "#{s[0..2].inspect}, and #{s.size - 3} more ..."
    else
      puts s.inspect
    end
  end
end
