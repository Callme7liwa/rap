
public class Artist {

    private Long id;
    private String name;
    private String slug;
    private String url;
    private String header_image_url;
    private Boolean is_verified;
    private byte followers_count;
    private byte iq;
    private String alternate_names; 
    private String instagram_name;
    private String twitter_name;
    private String facebook_name;
    private String normalized_name;

    @OneToMany(mappedBy = "artist", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Song> songs;

    @OneToMany(mappedBy = "artist", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Album> albums;

    public addName(String name) {
        this.alternate_names += name + ";";
    }

    public List<String> getAlternateNamesList() {
        return Arrays.asList(this.alternate_names.split(";"));
    }
}