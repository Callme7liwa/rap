public class Album {
    
    private Long id;
    private String name;
    private String slug;
    private String url;
    private String cover_art_url;
    private String full_title;
    private Date release_date_for_display;
    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Artist> artist;
    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Song> songs;
}
